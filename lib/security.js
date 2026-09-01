import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export function hashRateLimitKey(key) {
  return createHash('sha256').update(String(key)).digest('hex');
}

export function normalizeIp(value) {
  let candidate = String(value || '').split(',')[0].trim();
  if (!candidate) return null;
  if (candidate.startsWith('[')) {
    const end = candidate.indexOf(']');
    if (end > 0) candidate = candidate.slice(1, end);
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.slice(0, candidate.lastIndexOf(':'));
  }
  return isIP(candidate) ? candidate : null;
}
