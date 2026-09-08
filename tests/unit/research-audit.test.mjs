import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatResearchFailureAudit,
  formatResearchRetentionAudit,
  safeResearchErrorCode,
} from '../../lib/researchAuditCore.js';

test('research retention audit emits only fixed metadata and aggregate counts', () => {
  const piiCanary = 'person+private@example.com secret-search-term';
  const line = formatResearchRetentionAudit({
    version: 1,
    operation: 'research_retention_cleanup',
    mode: 'execute',
    asOfUtc: '2026-09-08T12:00:00Z',
    rawAnalyticsCutoffUtc: '2026-03-12T12:00:00Z',
    eligible: {
      analyticsEvents: 2,
      evaluationResponses: 3,
      feedbackSubmissions: 4,
      rawPayload: piiCanary,
    },
    deleted: { analyticsEvents: 2, evaluationResponses: 3, feedbackSubmissions: 4 },
    email: piiCanary,
    username: piiCanary,
  });

  assert.equal(line.includes(piiCanary), false);
  assert.deepEqual(JSON.parse(line), {
    version: 1,
    operation: 'research_retention_cleanup',
    mode: 'execute',
    asOfUtc: '2026-09-08T12:00:00Z',
    rawAnalyticsCutoffUtc: '2026-03-12T12:00:00Z',
    eligible: { analyticsEvents: 2, evaluationResponses: 3, feedbackSubmissions: 4 },
    deleted: { analyticsEvents: 2, evaluationResponses: 3, feedbackSubmissions: 4 },
  });
});

test('research audit rejects invalid counts and timestamps', () => {
  const base = {
    version: 1,
    operation: 'research_retention_cleanup',
    mode: 'dry_run',
    asOfUtc: '2026-09-08T12:00:00Z',
    rawAnalyticsCutoffUtc: '2026-03-12T12:00:00Z',
    eligible: { analyticsEvents: 0, evaluationResponses: 0, feedbackSubmissions: 0 },
    deleted: { analyticsEvents: 0, evaluationResponses: 0, feedbackSubmissions: 0 },
  };
  assert.throws(
    () => formatResearchRetentionAudit({ ...base, eligible: { ...base.eligible, analyticsEvents: -1 } }),
    /aggregate count/,
  );
  assert.throws(
    () => formatResearchRetentionAudit({ ...base, asOfUtc: 'today' }),
    /UTC timestamp/,
  );
});

test('research errors expose only a small allowlist of operational codes', () => {
  assert.equal(safeResearchErrorCode({ code: 'ETIMEDOUT' }), 'ETIMEDOUT');
  assert.equal(safeResearchErrorCode({ code: 'ER_ACCESS_DENIED_ERROR' }), 'ER_ACCESS_DENIED_ERROR');
  assert.equal(
    safeResearchErrorCode({ code: 'person+private@example.com secret-search-term' }),
    'UNKNOWN',
  );
  assert.equal(safeResearchErrorCode(new Error('private form content')), 'UNKNOWN');
  const failure = formatResearchFailureAudit(
    'research_retention_cleanup',
    { code: 'person+private@example.com secret-search-term' },
  );
  assert.equal(failure.includes('person+private@example.com'), false);
  assert.deepEqual(JSON.parse(failure), {
    version: 1,
    operation: 'research_retention_cleanup',
    outcome: 'failure',
    errorCode: 'UNKNOWN',
  });
});
