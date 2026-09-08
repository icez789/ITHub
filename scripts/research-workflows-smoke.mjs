import { randomBytes, randomUUID } from 'node:crypto';

import db from '../lib/db.js';
import {
  createCampaignRecord,
  listAdminCampaignRecords,
  listAdminFeedbackRecords,
  listMyEvaluationRecords,
  listMyFeedbackRecords,
  listOpenCampaignRecords,
  submitEvaluationRecord,
  submitFeedbackRecord,
  transitionCampaignRecord,
  updateDraftCampaignRecord,
  updateFeedbackTriageRecord,
  withdrawEvaluationRecord,
} from '../lib/researchRecordsCore.js';
import { assertE2eSafety } from './e2e-safety.mjs';

function assertion(condition, message) {
  if (condition) return;
  const error = new Error(message);
  error.code = 'E2E_ASSERTION_FAILED';
  throw error;
}

function isoOffset(days) {
  return new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString();
}

function evaluationInput(campaignId, clientSubmissionId) {
  return {
    campaignId,
    clientSubmissionId,
    respondentType: 'student',
    experienceLevel: 'intermediate',
    primaryDevice: 'desktop',
    consentAcknowledged: true,
    susAnswers: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
    taskResults: [1, 2, 3, 4, 5].map((taskId) => ({
      taskId,
      result: 'success',
      difficulty: taskId,
    })),
    openFeedback: 'E2E evaluation open feedback',
  };
}

async function main() {
  assertE2eSafety({ requireCredentials: true, requireWriteOptIn: true });
  let stage = 'setup';
  const suffix = randomBytes(8).toString('hex');
  const actorUsername = `research_admin_${suffix}`;
  const memberUsername = `research_member_${suffix}`;
  const actorEmail = `${actorUsername}@example.invalid`;
  const memberEmail = `${memberUsername}@example.invalid`;
  const piiCanary = `${memberEmail} private-feedback-${suffix}`;
  const campaignSlug = `research-workflow-${suffix}`;
  let actorId = null;
  let memberId = null;
  let campaignId = null;
  let operationError = null;
  const cleanupErrors = [];

  try {
    stage = 'create-test-users';
    const [actorResult] = await db.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, 'not-a-login-credential', 'super_admin')",
      [actorUsername, actorEmail],
    );
    actorId = Number(actorResult.insertId);
    const [memberResult] = await db.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, 'not-a-login-credential', 'user')",
      [memberUsername, memberEmail],
    );
    memberId = Number(memberResult.insertId);

    const draft = {
      slug: campaignSlug,
      name: 'E2E Research Workflow Pilot',
      dataScope: 'pilot',
      questionnaireVersion: 'sus-th-pilot-v1',
      consentNoticeVersion: 'research-notice-pilot-v1',
      eligibleMemberCount: 1,
      startsAt: isoOffset(-1),
      endsAt: isoOffset(1),
      retentionUntil: isoOffset(365),
    };
    stage = 'create-campaign';
    const created = await createCampaignRecord(db, actorId, draft);
    campaignId = created.campaignId;
    assertion(created.status === 'draft' && campaignId > 0, 'Campaign draft was not created');

    stage = 'update-and-open-campaign';
    const updated = await updateDraftCampaignRecord(db, actorId, campaignId, {
      ...draft,
      name: 'E2E Research Workflow Pilot Updated',
    });
    assertion(updated.status === 'updated', 'Campaign draft was not updated');
    const opened = await transitionCampaignRecord(db, actorId, campaignId, 'open');
    assertion(opened.status === 'open', 'Campaign did not open');

    const openCampaigns = await listOpenCampaignRecords(db);
    assertion(
      openCampaigns.some((campaign) => campaign.campaignId === campaignId),
      'Open campaign was not available to members',
    );
    const immutable = await updateDraftCampaignRecord(db, actorId, campaignId, draft);
    assertion(immutable.status === 'immutable', 'Open campaign remained editable');

    stage = 'submit-evaluation';
    const evaluationSubmissionId = randomUUID();
    const submitted = await submitEvaluationRecord(
      db,
      memberId,
      evaluationInput(campaignId, evaluationSubmissionId),
    );
    assertion(submitted.status === 'submitted' && !submitted.idempotent, 'Evaluation was not submitted');
    const repeatedEvaluation = await submitEvaluationRecord(
      db,
      memberId,
      evaluationInput(campaignId, evaluationSubmissionId),
    );
    assertion(
      repeatedEvaluation.status === 'already_submitted' && repeatedEvaluation.idempotent,
      'Evaluation retry was not idempotent',
    );
    const duplicateEvaluation = await submitEvaluationRecord(
      db,
      memberId,
      evaluationInput(campaignId, randomUUID()),
    );
    assertion(
      duplicateEvaluation.status === 'already_submitted' && !duplicateEvaluation.idempotent,
      'Second evaluation submission was not blocked',
    );

    const evaluationDtos = await listMyEvaluationRecords(db, memberId);
    assertion(
      evaluationDtos.length === 1
      && evaluationDtos[0].susScore === 100
      && !JSON.stringify(evaluationDtos).includes('E2E evaluation open feedback'),
      'Member evaluation DTO was not minimal',
    );
    stage = 'withdraw-evaluation';
    const withdrawn = await withdrawEvaluationRecord(db, memberId, campaignId);
    assertion(withdrawn.status === 'withdrawn' && withdrawn.changed, 'Evaluation was not withdrawn');
    const [[withdrawnRow]] = await db.query(
      `SELECT response_status, respondent_type, experience_level, primary_device,
              sus_answers, sus_score, task_results, open_feedback, withdrawn_at
       FROM evaluation_responses WHERE campaign_id = ? AND user_id = ?`,
      [campaignId, memberId],
    );
    assertion(
      withdrawnRow.response_status === 'withdrawn'
      && withdrawnRow.withdrawn_at
      && withdrawnRow.respondent_type == null
      && withdrawnRow.experience_level == null
      && withdrawnRow.primary_device == null
      && withdrawnRow.sus_answers == null
      && withdrawnRow.sus_score == null
      && withdrawnRow.task_results == null
      && withdrawnRow.open_feedback == null,
      'Evaluation withdrawal did not leave a clean tombstone',
    );
    const resubmitAfterWithdrawal = await submitEvaluationRecord(
      db,
      memberId,
      evaluationInput(campaignId, randomUUID()),
    );
    assertion(
      resubmitAfterWithdrawal.status === 'withdrawn_locked',
      'Evaluation was accepted after withdrawal',
    );

    stage = 'submit-feedback';
    const feedbackSubmissionId = randomUUID();
    const feedback = await submitFeedbackRecord(db, memberId, {
      campaignId,
      clientSubmissionId: feedbackSubmissionId,
      category: 'ux_ui',
      rating: 4,
      details: piiCanary,
      route: '/topic/42?private=query#reply',
    });
    assertion(feedback.status === 'submitted' && !feedback.idempotent, 'Feedback was not submitted');
    const repeatedFeedback = await submitFeedbackRecord(db, memberId, {
      campaignId,
      clientSubmissionId: feedbackSubmissionId,
      category: 'ux_ui',
      rating: 4,
      details: piiCanary,
      route: '/topic/42?private=query#reply',
    });
    assertion(repeatedFeedback.idempotent, 'Feedback retry was not idempotent');

    const memberFeedback = await listMyFeedbackRecords(db, memberId);
    assertion(
      memberFeedback.length === 1
      && memberFeedback[0].routePath === '/topic/42'
      && !JSON.stringify(memberFeedback).includes(piiCanary),
      'Member feedback DTO exposed private content',
    );
    const adminFeedback = await listAdminFeedbackRecords(db);
    const adminRecord = adminFeedback.find((item) => item.feedbackId === feedback.feedbackId);
    assertion(
      adminRecord?.details === piiCanary
      && !Object.hasOwn(adminRecord, 'userId'),
      'Admin feedback DTO did not preserve the intended authorization boundary',
    );

    stage = 'triage-feedback';
    const reviewing = await updateFeedbackTriageRecord(db, actorId, feedback.feedbackId, {
      status: 'reviewing',
      priority: 'high',
      issueTheme: 'navigation',
      internalNote: piiCanary,
    });
    assertion(
      reviewing.status === 'updated' && reviewing.feedbackStatus === 'reviewing',
      'Feedback was not moved to reviewing',
    );
    const resolved = await updateFeedbackTriageRecord(db, actorId, feedback.feedbackId, {
      status: 'resolved',
      priority: 'high',
      issueTheme: 'navigation',
      internalNote: piiCanary,
    });
    assertion(resolved.feedbackStatus === 'resolved', 'Feedback was not resolved');
    await updateFeedbackTriageRecord(db, actorId, feedback.feedbackId, {
      status: 'reviewing',
      priority: 'normal',
      issueTheme: null,
      internalNote: null,
    }).then(
      () => assertion(false, 'Terminal feedback was reopened'),
      (error) => assertion(/terminal/.test(error.message), 'Terminal feedback failed for the wrong reason'),
    );

    stage = 'close-and-lock-campaign';
    const closed = await transitionCampaignRecord(db, actorId, campaignId, 'closed');
    const locked = await transitionCampaignRecord(db, actorId, campaignId, 'locked');
    assertion(closed.status === 'closed' && locked.status === 'locked', 'Campaign did not close and lock');
    const campaigns = await listAdminCampaignRecords(db);
    assertion(
      campaigns.some((campaign) => campaign.campaignId === campaignId && campaign.status === 'locked'),
      'Admin campaign DTO did not show the locked campaign',
    );

    stage = 'verify-audit';
    const [[auditCheck]] = await db.query(
      `SELECT COUNT(*) AS count,
              SUM(CASE WHEN CAST(metadata AS CHAR) LIKE ? THEN 1 ELSE 0 END) AS leaked
       FROM moderation_audit_logs
       WHERE actor_id = ? AND target_type IN ('research_campaign', 'research_feedback')`,
      [`%${suffix}%`, actorId],
    );
    assertion(Number(auditCheck.count) >= 7, 'Research admin audit entries were missing');
    assertion(Number(auditCheck.leaked) === 0, 'Research admin audit metadata leaked a PII canary');
  } catch (error) {
    error.e2eStage = stage;
    operationError = error;
  } finally {
    if (actorId) {
      try {
        await db.query('DELETE FROM moderation_audit_logs WHERE actor_id = ?', [actorId]);
      } catch (error) {
        cleanupErrors.push({ stage: 'cleanup-audit', error });
      }
    }
    try {
      await db.query('DELETE FROM evaluation_campaigns WHERE slug = ?', [campaignSlug]);
    } catch (error) {
      cleanupErrors.push({ stage: 'cleanup-campaign', error });
    }
    for (const userId of [memberId, actorId].filter(Boolean)) {
      try {
        await db.query('DELETE FROM users WHERE id = ?', [userId]);
      } catch (error) {
        cleanupErrors.push({ stage: 'cleanup-users', error });
      }
    }
  }

  if (cleanupErrors.length) {
    const cleanupFailure = new Error('Research workflow E2E cleanup failed');
    cleanupFailure.code = cleanupErrors[0].error?.code ?? 'CLEANUP_ERROR';
    cleanupFailure.errno = cleanupErrors[0].error?.errno;
    cleanupFailure.sqlState = cleanupErrors[0].error?.sqlState;
    cleanupFailure.e2eStage = cleanupErrors[0].stage;
    throw cleanupFailure;
  }
  if (operationError) throw operationError;
  console.log('Research workflow E2E smoke passed: campaign, evaluation, feedback, audit, and cleanup.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    const stage = typeof error?.e2eStage === 'string' ? error.e2eStage : 'setup-or-cleanup';
    const code = typeof error?.code === 'string' ? error.code : 'UNCLASSIFIED_ERROR';
    const errno = Number.isInteger(error?.errno) ? `, errno ${error.errno}` : '';
    const sqlState = typeof error?.sqlState === 'string' ? `, SQL state ${error.sqlState}` : '';
    console.error(`Research workflow E2E smoke failed safely at ${stage} (${code}${errno}${sqlState}).`);
    process.exit(1);
  });
