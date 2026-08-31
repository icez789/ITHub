import 'server-only';

import { createHash } from 'node:crypto';
import db from './db';

const fallbackBuckets = globalThis.__ithubRateLimits || new Map();
if (process.env.NODE_ENV !== 'production') globalThis.__ithubRateLimits = fallbackBuckets;

let warnedAboutFallback = false;

export class RateLimitError extends Error {
  constructor() {
    super('Too many requests');
    this.name = 'RateLimitError';
  }
}

function hashedKey(key) {
  return createHash('sha256').update(String(key)).digest('hex');
}

function enforceMemoryFallback(key, { limit, windowMs }, now) {
  const bucket = fallbackBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    fallbackBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) throw new RateLimitError();
  bucket.count += 1;
}

function isMissingRateLimitTable(error) {
  return error?.code === 'ER_NO_SUCH_TABLE' || Number(error?.errno) === 1146;
}

function isIsolatedE2eEnvironment() {
  return String(process.env.ITHUB_E2E_ENVIRONMENT || '').toLowerCase() === 'e2e'
    && String(process.env.ITHUB_E2E_ALLOW_WRITES || '').toLowerCase() === 'true'
    && String(process.env.DB_NAME || '').toLowerCase().endsWith('_e2e');
}

export async function enforceRateLimit(key, { limit, windowMs }) {
  // Serial cross-browser tests intentionally repeat the same authenticated
  // flows. This bypass is unreachable unless all isolated E2E guards agree.
  if (isIsolatedE2eEnvironment()) return;

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs);
  const rateKey = hashedKey(key);
  const expiresAt = new Date((windowStart + 1) * windowMs);

  try {
    await db.query(
      `INSERT INTO rate_limits (rate_key, window_start, request_count, expires_at)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         request_count = request_count + 1,
         expires_at = VALUES(expires_at)`,
      [rateKey, windowStart, expiresAt],
    );
    const [rows] = await db.query(
      'SELECT request_count FROM rate_limits WHERE rate_key = ? AND window_start = ?',
      [rateKey, windowStart],
    );
    if (Number(rows[0]?.request_count || 0) > limit) throw new RateLimitError();

    if (Math.random() < 0.01) {
      await db.query('DELETE FROM rate_limits WHERE expires_at <= NOW() LIMIT 500');
    }
  } catch (error) {
    // Keep existing deployments available during the migration window. Once
    // db:migrate has run, every instance uses the shared database bucket.
    if (!isMissingRateLimitTable(error)) throw error;
    if (!warnedAboutFallback) {
      warnedAboutFallback = true;
      console.error('rate_limits table is missing; run npm run db:migrate');
    }
    enforceMemoryFallback(rateKey, { limit, windowMs }, now);
  }
}
