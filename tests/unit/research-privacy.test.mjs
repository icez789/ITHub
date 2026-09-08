import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createResearchSessionKey,
  createResearchSubjectKey,
  validateAnalyticsKeyVersion,
  validateAnalyticsSecret,
} from '../../lib/researchPrivacyCore.js';

const secret = 'test-only-secret-with-more-than-thirty-two-characters';

test('creates deterministic, domain-separated research subject keys', () => {
  const first = createResearchSubjectKey(42, secret, 1);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, createResearchSubjectKey(42, secret, 1));
  assert.notEqual(first, createResearchSubjectKey(43, secret, 1));
  assert.notEqual(first, createResearchSubjectKey(42, secret, 2));
});

test('creates session keys without preserving the browser session id', () => {
  const subjectKey = createResearchSubjectKey(42, secret, 1);
  const sessionId = '018f7781-2196-7c47-a1c2-a0f1366f1eaa';
  const key = createResearchSessionKey(subjectKey, sessionId, secret, 1);
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(key, createResearchSessionKey(subjectKey, sessionId, secret, 1));
  assert.notEqual(key, createResearchSessionKey(subjectKey, '018f7781-2196-7c47-a1c2-a0f1366f1eab', secret, 1));
  assert.equal(key.includes(sessionId), false);
});

test('rejects weak, placeholder, or malformed analytics key configuration', () => {
  assert.equal(validateAnalyticsSecret(secret), secret);
  for (const value of ['', 'short', 'preview-disabled', 'change-me-to-a-long-secret-value-please']) {
    assert.throws(() => validateAnalyticsSecret(value), /ITHUB_ANALYTICS_SECRET/);
  }
  assert.equal(validateAnalyticsKeyVersion('3'), 3);
  for (const value of [0, -1, '1.5', 'abc', 65_536]) {
    assert.throws(() => validateAnalyticsKeyVersion(value), /key version/);
  }
});

test('rejects malformed subject and session identifiers', () => {
  assert.throws(() => createResearchSubjectKey(0, secret, 1), /positive integer/);
  assert.throws(() => createResearchSubjectKey('42', secret, 1), /positive integer/);
  assert.throws(
    () => createResearchSessionKey('not-a-subject-key', '018f7781-2196-7c47-a1c2-a0f1366f1eaa', secret, 1),
    /subject key/,
  );
  assert.throws(
    () => createResearchSessionKey(createResearchSubjectKey(42, secret, 1), 'contains private text', secret, 1),
    /session id/,
  );
});
