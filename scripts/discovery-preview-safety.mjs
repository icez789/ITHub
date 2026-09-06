import { createHash } from 'node:crypto';
import { assertE2eSafety } from './e2e-safety.mjs';

export function previewDatabaseIdentity() {
  assertE2eSafety({ requireCredentials: false });
  for (const key of ['DB_HOST', 'DB_USER', 'DB_PASSWORD']) {
    if (!process.env[key] || process.env[key].includes('[SENSITIVE]')) {
      throw new Error(`A real isolated database value is required for ${key}`);
    }
  }
  return createHash('sha256').update(JSON.stringify([
    process.env.DB_HOST, String(process.env.DB_PORT || 4000),
    process.env.DB_USER, process.env.DB_NAME,
  ])).digest('hex');
}

export function isDiscoveryPreviewUrl(value) {
  const url = new URL(value);
  return url.protocol === 'https:'
    && /^it-[a-z0-9]+-thiraphat-s-projects\.vercel\.app$/.test(url.hostname);
}
