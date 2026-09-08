import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCampaignReadyToOpen,
  assertCampaignTransition,
  assertResearchRole,
  validateCampaignDraft,
  validateEvaluationSubmission,
  validateFeedbackSubmission,
  validateFeedbackTriage,
} from '../../lib/researchWorkflowCore.js';

test('validates pilot campaign drafts and chronological retention dates', () => {
  const campaign = validateCampaignDraft({
    slug: 'pilot-round-1',
    name: 'รอบทดลองใช้งาน 1',
    dataScope: 'pilot',
    questionnaireVersion: 'sus-th-pilot-v1',
    consentNoticeVersion: 'research-notice-pilot-v1',
    eligibleMemberCount: 20,
    startsAt: '2026-09-10T00:00:00Z',
    endsAt: '2026-09-20T00:00:00Z',
    retentionUntil: '2027-09-20T00:00:00Z',
  });
  assert.equal(campaign.slug, 'pilot-round-1');
  assert.equal(campaign.eligibleMemberCount, 20);
  assert.equal(campaign.startsAt.toISOString(), '2026-09-10T00:00:00.000Z');
  assert.doesNotThrow(() => assertCampaignReadyToOpen({ ...campaign, status: 'draft' }));
  assert.throws(
    () => assertCampaignReadyToOpen({
      ...campaign,
      status: 'draft',
      questionnaireVersion: 'sus-th-unreviewed-v2',
    }),
    /not supported/,
  );
  assert.throws(
    () => assertCampaignReadyToOpen({
      ...campaign,
      status: 'draft',
      consentNoticeVersion: 'research-notice-unreviewed-v2',
    }),
    /not supported/,
  );

  assert.throws(
    () => validateCampaignDraft({ ...campaign, dataScope: 'production' }),
    /pilot campaigns are enabled/,
  );
  assert.throws(
    () => validateCampaignDraft({ ...campaign, retentionUntil: '2026-09-19T00:00:00Z' }),
    /retention deadline/,
  );
});

test('allows only forward campaign lifecycle transitions', () => {
  assert.equal(assertCampaignTransition('draft', 'open'), 'open');
  assert.equal(assertCampaignTransition('open', 'closed'), 'closed');
  assert.equal(assertCampaignTransition('closed', 'locked'), 'locked');
  for (const [from, to] of [['draft', 'locked'], ['open', 'draft'], ['locked', 'open']]) {
    assert.throws(() => assertCampaignTransition(from, to), /transition/);
  }
});

test('validates a complete evaluation and calculates SUS server-side', () => {
  const result = validateEvaluationSubmission({
    campaignId: 7,
    clientSubmissionId: '018f7781-2196-7c47-a1c2-a0f1366f1ea9',
    respondentType: 'student',
    experienceLevel: 'intermediate',
    primaryDevice: 'desktop',
    consentAcknowledged: true,
    susAnswers: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
    taskResults: [1, 2, 3, 4, 5].map((taskId) => ({
      taskId,
      result: taskId === 5 ? 'not_attempted' : 'success',
      difficulty: taskId === 5 ? null : taskId,
    })),
    openFeedback: '  ใช้งานได้ดี  ',
  });
  assert.equal(result.susScore, 100);
  assert.equal(result.openFeedback, 'ใช้งานได้ดี');
  assert.equal(result.taskResults[4].difficulty, null);

  assert.throws(
    () => validateEvaluationSubmission({ ...result, consentAcknowledged: false }),
    /consent must be acknowledged/,
  );

  assert.throws(
    () => validateEvaluationSubmission({ ...result, consentAcknowledged: true, susAnswers: [5, 1] }),
    /exactly 10/,
  );
  assert.throws(
    () => validateEvaluationSubmission({
      ...result,
      consentAcknowledged: true,
      taskResults: result.taskResults.map((task) => ({ ...task, difficulty: 3 })),
    }),
    /not-attempted task/,
  );
});

test('validates feedback without retaining query strings or arbitrary triage values', () => {
  const feedback = validateFeedbackSubmission({
    campaignId: null,
    clientSubmissionId: '018f7781-2196-7c47-a1c2-a0f1366f1eaa',
    category: 'ux_ui',
    rating: 4,
    details: 'ปุ่มนี้หาได้ค่อนข้างยาก',
    route: '/topic/42?draft=private#reply',
  });
  assert.equal(feedback.routePath, '/topic/42');
  assert.equal(feedback.rating, 4);

  assert.throws(
    () => validateFeedbackSubmission({ ...feedback, route: 'https://example.com/private' }),
    /route/,
  );
  assert.throws(
    () => validateFeedbackTriage({
      status: 'resolved',
      priority: 'urgent',
      issueTheme: 'free-form-private-label',
      internalNote: '',
    }, { currentStatus: 'new' }),
    /issue theme/,
  );
  assert.throws(
    () => validateFeedbackTriage({
      status: 'reviewing',
      priority: 'normal',
      issueTheme: 'navigation',
      internalNote: '',
    }, { currentStatus: 'resolved' }),
    /terminal/,
  );
});

test('enforces member, admin, and super-admin role boundaries', () => {
  const member = { id: 1, role: 'user' };
  const teacher = { id: 2, role: 'teacher' };
  const admin = { id: 3, role: 'admin' };
  const superAdmin = { id: 4, role: 'super_admin' };

  assert.equal(assertResearchRole(member, 'member'), member);
  assert.equal(assertResearchRole(admin, 'admin'), admin);
  assert.equal(assertResearchRole(superAdmin, 'admin'), superAdmin);
  assert.equal(assertResearchRole(superAdmin, 'super_admin'), superAdmin);
  assert.throws(() => assertResearchRole(null, 'member'), /Unauthorized/);
  assert.throws(() => assertResearchRole(teacher, 'admin'), /Forbidden/);
  assert.throws(() => assertResearchRole(admin, 'super_admin'), /Forbidden/);
});
