import test from 'node:test';
import assert from 'node:assert/strict';
import { hashRateLimitKey, normalizeIp } from '../../lib/security.js';

test('rate-limit keys are stable hashes and do not expose identifiers', () => {
  const value = 'login-account:member@example.com';
  const hash = hashRateLimitKey(value);
  assert.equal(hash.length, 64);
  assert.equal(hash, hashRateLimitKey(value));
  assert.equal(hash.includes('member'), false);
});

test('normalizes trusted IPv4 and IPv6 header values', () => {
  assert.equal(normalizeIp('203.0.113.10, 10.0.0.1'), '203.0.113.10');
  assert.equal(normalizeIp('203.0.113.10:443'), '203.0.113.10');
  assert.equal(normalizeIp('[2001:db8::1]:443'), '2001:db8::1');
  assert.equal(normalizeIp('spoofed'), null);
});
