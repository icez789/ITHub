import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAnalyticsConsentStateRecord,
  grantAnalyticsConsentRecord,
  withdrawAnalyticsConsentRecord,
} from '../../lib/researchConsentCore.js';

const subjectKey = 'a'.repeat(64);

function createDatabase(responses = []) {
  const calls = [];
  let responseIndex = 0;
  const connection = {
    async beginTransaction() { calls.push(['begin']); },
    async query(sql, params = []) {
      calls.push(['query', sql.replace(/\s+/g, ' ').trim(), params]);
      const response = responses[responseIndex];
      responseIndex += 1;
      if (response instanceof Error) throw response;
      return response ?? [[], []];
    },
    async commit() { calls.push(['commit']); },
    async rollback() { calls.push(['rollback']); },
    release() { calls.push(['release']); },
  };
  return {
    calls,
    async getConnection() {
      calls.push(['getConnection']);
      return connection;
    },
    async query(sql, params = []) {
      calls.push(['poolQuery', sql.replace(/\s+/g, ' ').trim(), params]);
      const response = responses[responseIndex];
      responseIndex += 1;
      if (response instanceof Error) throw response;
      return response ?? [[], []];
    },
  };
}

test('grants new analytics consent in one transaction', async () => {
  const database = createDatabase([
    [[], []],
    [{ affectedRows: 1 }, []],
  ]);

  const result = await grantAnalyticsConsentRecord(database, {
    userId: 42,
    subjectKey,
    keyVersion: 1,
    noticeVersion: 'privacy-2026-09-07',
  });

  assert.deepEqual(result, { status: 'active', created: true, changed: true });
  assert.deepEqual(database.calls.map(([name]) => name), [
    'getConnection', 'begin', 'query', 'query', 'commit', 'release',
  ]);
  const insert = database.calls[3];
  assert.match(insert[1], /^INSERT INTO analytics_consents/);
  assert.deepEqual(insert[2], [42, subjectKey, 1, 'privacy-2026-09-07']);
});

test('keeps the existing subject key when active consent is idempotent', async () => {
  const database = createDatabase([
    [[{
      user_id: 42,
      subject_key: 'b'.repeat(64),
      key_version: 1,
      notice_version: 'privacy-2026-09-07',
      status: 'active',
    }], []],
  ]);

  const result = await grantAnalyticsConsentRecord(database, {
    userId: 42,
    subjectKey,
    keyVersion: 2,
    noticeVersion: 'privacy-2026-09-07',
  });

  assert.deepEqual(result, { status: 'active', created: false, changed: false });
  assert.deepEqual(database.calls.map(([name]) => name), [
    'getConnection', 'begin', 'query', 'commit', 'release',
  ]);
});

test('withdraws consent and deletes linked raw events atomically', async () => {
  const database = createDatabase([
    [[{ subject_key: subjectKey, status: 'active' }], []],
    [{ affectedRows: 1 }, []],
    [{ affectedRows: 3 }, []],
  ]);

  const result = await withdrawAnalyticsConsentRecord(database, 42);
  assert.deepEqual(result, { status: 'withdrawn', changed: true, deletedEvents: 3 });
  assert.match(database.calls[3][1], /^UPDATE analytics_consents/);
  assert.match(database.calls[4][1], /^DELETE FROM analytics_events/);
  assert.deepEqual(database.calls.map(([name]) => name), [
    'getConnection', 'begin', 'query', 'query', 'query', 'commit', 'release',
  ]);
});

test('rolls back consent changes when event deletion fails', async () => {
  const database = createDatabase([
    [[{ subject_key: subjectKey, status: 'active' }], []],
    [{ affectedRows: 1 }, []],
    new Error('delete failed'),
  ]);

  await assert.rejects(() => withdrawAnalyticsConsentRecord(database, 42), /delete failed/);
  assert.deepEqual(database.calls.map(([name]) => name), [
    'getConnection', 'begin', 'query', 'query', 'query', 'rollback', 'release',
  ]);
});

test('returns a minimal consent DTO without subject or user identifiers', async () => {
  const database = createDatabase([
    [[{
      status: 'active',
      notice_version: 'privacy-2026-09-07',
      consented_at: new Date('2026-09-07T00:00:00.000Z'),
      withdrawn_at: null,
    }], []],
  ]);

  const result = await getAnalyticsConsentStateRecord(database, 42);
  assert.deepEqual(result, {
    status: 'active',
    noticeVersion: 'privacy-2026-09-07',
    consentedAt: new Date('2026-09-07T00:00:00.000Z'),
    withdrawnAt: null,
  });
  assert.equal(Object.hasOwn(result, 'subjectKey'), false);
  assert.equal(Object.hasOwn(result, 'userId'), false);
});
