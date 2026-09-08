import test from 'node:test';
import assert from 'node:assert/strict';

import { loadResearchMetricDataset } from '../../lib/researchMetricsRecordsCore.js';

const campaign = {
  campaignId: 7,
  slug: 'pilot-round',
  name: 'Pilot round',
  status: 'open',
  dataScope: 'pilot',
  eligibleMemberCount: 10,
  startsAt: new Date('2026-09-01T00:00:00.000Z'),
  endsAt: new Date('2026-10-01T00:00:00.000Z'),
};

function databaseFixture({ failure = null } = {}) {
  const calls = [];
  const connection = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (failure && normalized.includes(failure)) throw new Error('database unavailable');
      if (normalized.startsWith('SET time_zone')) return [[], []];
      if (normalized.startsWith('SELECT response.respondent_type')) {
        return [[{
          respondent_type: 'student',
          experience_level: 'intermediate',
          primary_device: 'desktop',
          sus_score: '72.50',
          task_results: JSON.stringify([{ taskId: 1, result: 'success', difficulty: 1 }]),
          user_id: 999,
          open_feedback: 'private@example.com',
        }], []];
      }
      if (normalized.includes('AS consent_count')) return [[{ consent_count: 5 }], []];
      if (normalized.includes('AS subject_count')) {
        return [[{ subject_count: 5, session_count: 6, event_count: 20 }], []];
      }
      if (normalized.includes('GROUP BY event.event_name')) {
        return [[{
          event_name: 'feed_viewed',
          outcome: null,
          property_feed: 'for_you',
          property_active: null,
          event_count: 5,
          subject_key: 'a'.repeat(64),
        }], []];
      }
      if (normalized.includes('COUNT(DISTINCT search_event.id)')) {
        return [[{ denominator: 5, numerator: 4 }], []];
      }
      if (normalized.includes('COALESCE(SUM(flags.task_2)')) {
        return [[{ eligible_count: 5, task_2: 4, task_3: 3, task_4: 2, task_5: 1 }], []];
      }
      if (normalized.includes('COUNT(DISTINCT observed_search.subject_key)')) {
        return [[{ observed_count: 4 }], []];
      }
      if (normalized.startsWith('SELECT feedback.category')) {
        return [[{
          category: 'bug',
          priority: 'high',
          status: 'reviewing',
          issue_theme: 'navigation',
          feedback_count: 5,
          details: 'private details',
          internal_note: 'private note',
        }], []];
      }
      throw new Error(`Unexpected query: ${normalized}`);
    },
    async beginTransaction() { calls.push({ sql: 'BEGIN', params: [] }); },
    async commit() { calls.push({ sql: 'COMMIT', params: [] }); },
    async rollback() { calls.push({ sql: 'ROLLBACK', params: [] }); },
    release() { calls.push({ sql: 'RELEASE', params: [] }); },
  };
  return {
    calls,
    database: { async getConnection() { return connection; } },
  };
}

test('loads only deidentified metric DTOs from a single read snapshot', async () => {
  const { database, calls } = databaseFixture();
  const result = await loadResearchMetricDataset(database, campaign, { campaign: '7' }, {
    now: new Date('2026-09-20T00:00:00.000Z'),
  });

  assert.deepEqual(result.evaluations, [{
    respondentType: 'student',
    experienceLevel: 'intermediate',
    primaryDevice: 'desktop',
    susScore: 72.5,
    taskResults: [{ taskId: 1, result: 'success' }],
  }]);
  assert.deepEqual(result.observedTasks, [
    { taskId: 1, eligibleCount: 5, observedCount: 4 },
    { taskId: 2, eligibleCount: 5, observedCount: 4 },
    { taskId: 3, eligibleCount: 5, observedCount: 3 },
    { taskId: 4, eligibleCount: 5, observedCount: 2 },
    { taskId: 5, eligibleCount: 5, observedCount: 1 },
  ]);
  const serialized = JSON.stringify(result);
  for (const forbidden of ['private@example.com', 'private details', 'private note', '"userId"', '"subjectKey"']) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.deepEqual(calls.slice(-2).map((call) => call.sql), ['COMMIT', 'RELEASE']);
});

test('adds demographic constraints only as bound parameters', async () => {
  const { database, calls } = databaseFixture();
  await loadResearchMetricDataset(database, campaign, {
    campaign: '7',
    respondent: 'teacher',
    experience: 'advanced',
    device: 'mobile',
  }, { now: new Date('2026-09-20T00:00:00.000Z') });
  const evaluationQuery = calls.find((call) => call.sql.startsWith('SELECT response.respondent_type'));
  assert.match(evaluationQuery.sql, /response\.respondent_type = \?/);
  assert.equal(evaluationQuery.sql.includes('teacher'), false);
  assert.deepEqual(evaluationQuery.params.slice(-3), ['teacher', 'advanced', 'mobile']);
});

test('rolls back the complete metric read when one query fails', async () => {
  const { database, calls } = databaseFixture({ failure: 'GROUP BY event.event_name' });
  await assert.rejects(
    loadResearchMetricDataset(database, campaign, { campaign: '7' }, {
      now: new Date('2026-09-20T00:00:00.000Z'),
    }),
    /database unavailable/,
  );
  assert.deepEqual(calls.slice(-2).map((call) => call.sql), ['ROLLBACK', 'RELEASE']);
});
