import { createHmac, timingSafeEqual } from 'node:crypto';

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(encodedPayload, secret) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSignedSessionToken(user, secret, { now = Math.floor(Date.now() / 1000), ttlSeconds = 86_400 } = {}) {
  const sessionVersion = Number(user.session_version);
  if (!Number.isInteger(sessionVersion) || sessionVersion < 1) throw new Error('A valid session_version is required to create a session');
  const payload = encode(JSON.stringify({ userId: Number(user.id), sessionVersion, issuedAt: now, expiresAt: now + ttlSeconds }));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySignedSessionToken(token, secret, { now = Math.floor(Date.now() / 1000) } = {}) {
  if (typeof token !== 'string') return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !safeEqual(sign(payload, secret), signature)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isInteger(session.userId) || session.userId <= 0
      || !Number.isInteger(session.sessionVersion) || session.sessionVersion < 1
      || !Number.isInteger(session.issuedAt) || !Number.isInteger(session.expiresAt)
      || session.expiresAt <= now) return null;
    return session;
  } catch {
    return null;
  }
}
