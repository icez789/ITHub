import test from 'node:test';
import assert from 'node:assert/strict';

import {
  listAdminFeedbackRecords,
  listMyEvaluationRecords,
  listMyFeedbackRecords,
  updateFeedbackTriageRecord,
} from '../../lib/researchRecordsCore.js';

test('member research DTOs exclude ownership, open text, and internal notes', async () => {
  const database = {
    async query(sql) {
      if (sql.includes('FROM evaluation_responses')) {
        return [[{
          id: 11,
          campaign_id: 7,
          campaign_name: 'Pilot',
          response_status: 'submitted',
          sus_score: '72.50',
          submitted_at: 'submitted-at',
          withdrawn_at: null,
          user_id: 99,
          open_feedback: 'private evaluation text',
          respondent_type: 'student',
        }]];
      }
      return [[{
        id: 12,
        category: 'bug',
        rating: 4,
        route_path: '/feedback',
        status: 'reviewing',
        created_at: 'created-at',
        resolved_at: null,
        user_id: 99,
        details: 'private feedback text',
        internal_note: 'private admin note',
      }]];
    },
  };

  assert.deepEqual(await listMyEvaluationRecords(database, 99), [{
    evaluationId: 11,
    campaignId: 7,
    campaignName: 'Pilot',
    status: 'submitted',
    susScore: 72.5,
    submittedAt: 'submitted-at',
    withdrawnAt: null,
  }]);
  assert.deepEqual(await listMyFeedbackRecords(database, 99), [{
    feedbackId: 12,
    category: 'bug',
    rating: 4,
    routePath: '/feedback',
    status: 'reviewing',
    createdAt: 'created-at',
    resolvedAt: null,
  }]);
});

test('admin feedback DTO includes triage content but no member identifier', async () => {
  const database = {
    async query() {
      return [[{
        id: 21,
        campaign_id: null,
        data_scope: 'pilot',
        category: 'ux_ui',
        rating: null,
        details: 'Details for authorized triage',
        route_path: '/feedback',
        status: 'new',
        priority: 'normal',
        issue_theme: null,
        internal_note: null,
        created_at: 'created-at',
        updated_at: 'updated-at',
        resolved_at: null,
        user_id: 99,
        email: 'private@example.com',
        username: 'private-user',
      }]];
    },
  };
  const [dto] = await listAdminFeedbackRecords(database);
  assert.equal(dto.details, 'Details for authorized triage');
  assert.equal(Object.hasOwn(dto, 'userId'), false);
  assert.equal(JSON.stringify(dto).includes('private@example.com'), false);
  assert.equal(JSON.stringify(dto).includes('private-user'), false);
});

function triageDatabase({ currentStatus = 'new' } = {}) {
  const calls = [];
  const connection = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (normalized.startsWith('SELECT id, status')) {
        return [[{
          id: 31,
          status: currentStatus,
          priority: 'normal',
          issue_theme: null,
          internal_note: 'old note',
        }]];
      }
      return [{ affectedRows: 1, insertId: 1 }];
    },
    async beginTransaction() {
      calls.push({ sql: 'BEGIN', params: [] });
    },
    async commit() {
      calls.push({ sql: 'COMMIT', params: [] });
    },
    async rollback() {
      calls.push({ sql: 'ROLLBACK', params: [] });
    },
    release() {
      calls.push({ sql: 'RELEASE', params: [] });
    },
  };
  return {
    calls,
    database: { async getConnection() { return connection; } },
  };
}

test('feedback triage writes a safe audit without copying the internal note', async () => {
  const piiCanary = 'person+private@example.com internal private note';
  const { database, calls } = triageDatabase();
  const result = await updateFeedbackTriageRecord(database, 5, 31, {
    status: 'reviewing',
    priority: 'high',
    issueTheme: 'navigation',
    internalNote: piiCanary,
  });
  assert.equal(result.status, 'updated');
  const audit = calls.find((call) => call.sql.startsWith('INSERT INTO moderation_audit_logs'));
  assert.ok(audit);
  assert.equal(audit.params[4].includes(piiCanary), false);
  assert.deepEqual(JSON.parse(audit.params[4]), {
    fromStatus: 'new',
    toStatus: 'reviewing',
    priority: 'high',
    issueTheme: 'navigation',
    internalNoteChanged: true,
  });
  assert.deepEqual(calls.slice(-2).map((call) => call.sql), ['COMMIT', 'RELEASE']);
});

test('feedback triage rolls back when a terminal record is reopened', async () => {
  const { database, calls } = triageDatabase({ currentStatus: 'resolved' });
  await assert.rejects(
    updateFeedbackTriageRecord(database, 5, 31, {
      status: 'reviewing',
      priority: 'normal',
      issueTheme: null,
      internalNote: null,
    }),
    /terminal/,
  );
  assert.deepEqual(calls.slice(-2).map((call) => call.sql), ['ROLLBACK', 'RELEASE']);
});
