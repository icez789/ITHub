import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AnalyticsCampaignUnavailableError,
  AnalyticsConsentRequiredError,
  insertAnalyticsEventRecords,
} from '../../lib/researchAnalyticsRecordsCore.js';

const subjectKey = 'a'.repeat(64);
const sessionKey = 'b'.repeat(64);
const event = {
  eventId: '018f7781-2196-7c47-a1c2-a0f1366f1ea9',
  sessionId: '018f7781-2196-7c47-a1c2-a0f1366f1eaa',
  eventName: 'evaluation_submitted',
  eventVersion: 1,
  outcome: 'success',
  failureCode: null,
  route: '/feedback',
  campaignId: 7,
  properties: {},
  occurredAt: '2026-09-08T12:00:00.123Z',
};

function createDatabase(responses = []) {
  const calls = [];
  let responseIndex = 0;
  const connection = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ type: 'query', sql: normalized, params });
      const response = responses[responseIndex];
      responseIndex += 1;
      if (response instanceof Error) throw response;
      return response ?? [[], []];
    },
    async beginTransaction() { calls.push({ type: 'begin' }); },
    async commit() { calls.push({ type: 'commit' }); },
    async rollback() { calls.push({ type: 'rollback' }); },
    release() { calls.push({ type: 'release' }); },
  };
  return {
    calls,
    database: { async getConnection() { calls.push({ type: 'getConnection' }); return connection; } },
  };
}

function activeConsentResponse() {
  return [[{ subject_key: subjectKey, key_version: 1, status: 'active' }], []];
}

function openCampaignResponse() {
  return [[{
    id: 7,
    status: 'open',
    data_scope: 'pilot',
    starts_at: new Date('2026-09-01T00:00:00.000Z'),
    ends_at: new Date('2026-09-30T00:00:00.000Z'),
    database_now: new Date('2026-09-08T12:00:00.000Z'),
  }], []];
}

test('locks active consent and campaign before inserting only pseudonymous event fields', async () => {
  const { database, calls } = createDatabase([
    [[], []],
    activeConsentResponse(),
    openCampaignResponse(),
    [{ affectedRows: 1 }, []],
  ]);
  const keyInputs = [];
  const result = await insertAnalyticsEventRecords(database, 42, [event], {
    createSessionKey(...args) { keyInputs.push(args); return sessionKey; },
  });

  assert.deepEqual(result, { status: 'accepted', accepted: 1, duplicates: 0 });
  const consentRead = calls.find((call) => call.sql?.includes('FROM analytics_consents'));
  const campaignRead = calls.find((call) => call.sql?.includes('FROM evaluation_campaigns'));
  const insert = calls.find((call) => call.sql?.startsWith('INSERT INTO analytics_events'));
  assert.match(consentRead.sql, /FOR UPDATE$/);
  assert.match(campaignRead.sql, /FOR UPDATE$/);
  assert.deepEqual(keyInputs, [[subjectKey, event.sessionId, 1]]);
  assert.equal(insert.params.includes(42), false);
  assert.equal(insert.params.includes(event.sessionId), false);
  assert.equal(JSON.stringify(insert.params).includes('private@example.com'), false);
  assert.equal(insert.params.at(-1), '2026-09-08 12:00:00.123');
  assert.deepEqual(calls.slice(-2).map((call) => call.type), ['commit', 'release']);
});

test('treats duplicate event ids as idempotent retries and commits the batch', async () => {
  const duplicate = Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY', errno: 1062 });
  const { database, calls } = createDatabase([
    [[], []],
    activeConsentResponse(),
    openCampaignResponse(),
    [{ affectedRows: 1 }, []],
    duplicate,
  ]);
  const second = { ...event, eventId: '018f7781-2196-7c47-a1c2-a0f1366f1eab' };
  const result = await insertAnalyticsEventRecords(database, 42, [event, second], {
    createSessionKey: () => sessionKey,
  });
  assert.deepEqual(result, { status: 'accepted', accepted: 1, duplicates: 1 });
  assert.deepEqual(calls.slice(-2).map((call) => call.type), ['commit', 'release']);
});

test('rejects absent or withdrawn consent before any analytics insert', async () => {
  for (const rows of [[], [{ subject_key: subjectKey, key_version: 1, status: 'withdrawn' }]]) {
    const { database, calls } = createDatabase([
      [[], []],
      [rows, []],
    ]);
    await assert.rejects(
      insertAnalyticsEventRecords(database, 42, [event], { createSessionKey: () => sessionKey }),
      AnalyticsConsentRequiredError,
    );
    assert.equal(calls.some((call) => call.sql?.startsWith('INSERT INTO analytics_events')), false);
    assert.deepEqual(calls.slice(-2).map((call) => call.type), ['rollback', 'release']);
  }
});

test('rejects closed, non-pilot, missing, or out-of-window campaigns atomically', async () => {
  for (const campaignRows of [
    [],
    [{ ...openCampaignResponse()[0][0], status: 'closed' }],
    [{ ...openCampaignResponse()[0][0], data_scope: 'production' }],
    [{ ...openCampaignResponse()[0][0], starts_at: new Date('2026-09-09T00:00:00.000Z') }],
  ]) {
    const { database, calls } = createDatabase([
      [[], []],
      activeConsentResponse(),
      [campaignRows, []],
    ]);
    await assert.rejects(
      insertAnalyticsEventRecords(database, 42, [event], { createSessionKey: () => sessionKey }),
      AnalyticsCampaignUnavailableError,
    );
    assert.equal(calls.some((call) => call.sql?.startsWith('INSERT INTO analytics_events')), false);
  }
});

test('rolls back the complete batch on a non-idempotency database failure', async () => {
  const { database, calls } = createDatabase([
    [[], []],
    activeConsentResponse(),
    openCampaignResponse(),
    new Error('database unavailable'),
  ]);
  await assert.rejects(
    insertAnalyticsEventRecords(database, 42, [event], { createSessionKey: () => sessionKey }),
    /database unavailable/,
  );
  assert.deepEqual(calls.slice(-2).map((call) => call.type), ['rollback', 'release']);
});
