import 'server-only';

import { normalizeIp } from './security';

export function getTrustedClientIp(requestHeaders) {
  const candidates = process.env.VERCEL === '1'
    ? [requestHeaders.get('x-vercel-forwarded-for'), requestHeaders.get('x-forwarded-for')]
    : [requestHeaders.get('x-real-ip'), requestHeaders.get('x-forwarded-for')];

  for (const candidate of candidates) {
    const ip = normalizeIp(candidate);
    if (ip) return ip;
  }
  return 'unknown';
}
