import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RAW_ANALYTICS_RETENTION_DAYS,
  calculateRawAnalyticsCutoff,
  isRawAnalyticsExpired,
  isResearchRecordExpired,
  runResearchRetentionCleanup,
} from '../../lib/researchRetentionCore.js';

const clock = {
  asOfUtc: '2026-09-08T12:00:00Z',
  rawAnalyticsCutoffUtc: '2026-03-12T12:00:00Z',
};

function fakeDatabase({
  eligible = { analyticsEvents: 2, evaluationResponses: 3, feedbackSubmissions: 4 },
  deleted = eligible,
  failOnDelete = false,
} = {}) {
  const calls = [];
  const connection = {
    async beginTransaction() {
      calls.push('BEGIN');
    },
    async commit() {
      calls.push('COMMIT');
    },
    async rollback() {
      calls.push('ROLLBACK');
    },
    release() {
      calls.push('RELEASE');
    },
    async query(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push(normalized);
      if (normalized.startsWith('SET @ithub_retention_as_of')) return [{}];
      if (normalized.startsWith('SELECT DATE_FORMAT')) {
        return [[{
          as_of_utc: clock.asOfUtc,
          raw_analytics_cutoff_utc: clock.rawAnalyticsCutoffUtc,
        }]];
      }
      if (normalized.startsWith('SELECT COUNT(*)') && normalized.includes('FROM analytics_events')) {
        return [[{ count: eligible.analyticsEvents }]];
      }
      if (normalized.startsWith('SELECT COUNT(*)') && normalized.includes('FROM evaluation_responses')) {
        return [[{ count: eligible.evaluationResponses }]];
      }
      if (normalized.startsWith('SELECT COUNT(*)') && normalized.includes('FROM feedback_submissions')) {
        return [[{ count: eligible.feedbackSubmissions }]];
      }
      if (normalized.startsWith('DELETE')) {
        if (failOnDelete) throw new Error('simulated database failure');
        if (normalized.includes('analytics_events')) return [{ affectedRows: deleted.analyticsEvents }];
        if (normalized.includes('evaluation_responses')) return [{ affectedRows: deleted.evaluationResponses }];
        if (normalized.includes('feedback_submissions')) return [{ affectedRows: deleted.feedbackSubmissions }];
      }
      throw new Error(`Unexpected query: ${normalized}`);
    },
  };
  return {
    calls,
    database: {
      async getConnection() {
        calls.push('GET_CONNECTION');
        return connection;
      },
    },
  };
}

test('uses an exclusive 180-day raw-event cutoff and inclusive research deadlines', () => {
  assert.equal(RAW_ANALYTICS_RETENTION_DAYS, 180);
  const asOf = new Date('2026-09-08T12:00:00.000Z');
  const cutoff = calculateRawAnalyticsCutoff(asOf);
  assert.equal(cutoff.toISOString(), '2026-03-12T12:00:00.000Z');
  assert.equal(isRawAnalyticsExpired(cutoff, asOf), false);
  assert.equal(isRawAnalyticsExpired(new Date(cutoff.getTime() - 1), asOf), true);
  assert.equal(isResearchRecordExpired(asOf, asOf), true);
  assert.equal(isResearchRecordExpired(new Date(asOf.getTime() + 1), asOf), false);
  assert.equal(isResearchRecordExpired(null, asOf), false);
});

test('reports eligible rows without deleting anything in dry-run mode', async () => {
  const { database, calls } = fakeDatabase();
  const report = await runResearchRetentionCleanup(database);

  assert.deepEqual(report, {
    version: 1,
    operation: 'research_retention_cleanup',
    mode: 'dry_run',
    asOfUtc: clock.asOfUtc,
    rawAnalyticsCutoffUtc: clock.rawAnalyticsCutoffUtc,
    eligible: { analyticsEvents: 2, evaluationResponses: 3, feedbackSubmissions: 4 },
    deleted: { analyticsEvents: 0, evaluationResponses: 0, feedbackSubmissions: 0 },
  });
  assert.equal(calls.some((call) => call.startsWith?.('DELETE')), false);
  assert.deepEqual(calls.slice(-2), ['COMMIT', 'RELEASE']);
});

test('deletes all eligible research records atomically in execute mode', async () => {
  const { database, calls } = fakeDatabase();
  const report = await runResearchRetentionCleanup(database, { execute: true });

  assert.deepEqual(report.deleted, {
    analyticsEvents: 2,
    evaluationResponses: 3,
    feedbackSubmissions: 4,
  });
  assert.equal(calls.filter((call) => call.startsWith?.('DELETE')).length, 3);
  assert.deepEqual(calls.slice(-2), ['COMMIT', 'RELEASE']);
});

test('rolls back the whole cleanup when any deletion fails', async () => {
  const { database, calls } = fakeDatabase({ failOnDelete: true });
  await assert.rejects(
    runResearchRetentionCleanup(database, { execute: true }),
    /simulated database failure/,
  );
  assert.equal(calls.includes('COMMIT'), false);
  assert.deepEqual(calls.slice(-2), ['ROLLBACK', 'RELEASE']);
});
