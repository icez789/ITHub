import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignedSessionToken, verifySignedSessionToken } from '../../lib/sessionToken.js';

const secret = 'test-secret-that-is-long-enough-for-hmac';

test('session token requires and preserves session version', () => {
  const token = createSignedSessionToken({ id: 7, session_version: 3 }, secret, { now: 100, ttlSeconds: 60 });
  assert.deepEqual(verifySignedSessionToken(token, secret, { now: 120 }), { userId: 7, sessionVersion: 3, issuedAt: 100, expiresAt: 160 });
  assert.throws(() => createSignedSessionToken({ id: 7 }, secret));
});

test('rejects legacy, tampered, and expired sessions', () => {
  const legacyPayload = Buffer.from(JSON.stringify({ userId: 7, issuedAt: 100, expiresAt: 160 })).toString('base64url');
  assert.equal(verifySignedSessionToken(`${legacyPayload}.invalid`, secret, { now: 120 }), null);
  const token = createSignedSessionToken({ id: 7, session_version: 1 }, secret, { now: 100, ttlSeconds: 10 });
  assert.equal(verifySignedSessionToken(token, secret, { now: 111 }), null);
  assert.equal(verifySignedSessionToken(`${token}x`, secret, { now: 105 }), null);
});
