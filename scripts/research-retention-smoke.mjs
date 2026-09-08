import { randomBytes, randomUUID } from 'node:crypto';

import db from '../lib/db.js';
import {
  formatResearchFailureAudit,
  formatResearchRetentionAudit,
} from '../lib/researchAuditCore.js';
import { createResearchSessionKey, createResearchSubjectKey } from '../lib/researchPrivacyCore.js';
import { runResearchRetentionCleanup } from '../lib/researchRetentionCore.js';
import { assertE2eSafety } from './e2e-safety.mjs';

function e2eAssertion(condition, message) {
  if (condition) return;
  const error = new Error(message);
  error.code = 'E2E_ASSERTION_FAILED';
  throw error;
}

function expectedCounts(report, expected) {
  return ['analyticsEvents', 'evaluationResponses', 'feedbackSubmissions']
    .every((key) => report[key] === expected);
}

async function insertCampaign({ slug, name, userId, expired }) {
  const retentionExpression = expired
    ? 'DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)'
    : 'DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY)';
  const startsExpression = expired
    ? 'DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)'
    : 'DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)';
  const endsExpression = expired
    ? 'DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)'
    : 'DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY)';
  const [result] = await db.query(`
    INSERT INTO evaluation_campaigns
      (slug, name, status, data_scope, questionnaire_version, consent_notice_version,
       eligible_member_count, starts_at, ends_at, retention_until, created_by, updated_by)
    VALUES (?, ?, 'locked', 'pilot', 'e2e-v1', 'e2e-consent-v1', 1,
      ${startsExpression}, ${endsExpression}, ${retentionExpression}, ?, ?)
  `, [slug, name, userId, userId]);
  return Number(result.insertId);
}

async function insertEvaluationResponse({ campaignId, userId, openFeedback }) {
  await db.query(`
    INSERT INTO evaluation_responses
      (campaign_id, user_id, client_submission_id, response_status, respondent_type,
       experience_level, primary_device, sus_answers, sus_score, task_results, open_feedback)
    VALUES (?, ?, ?, 'submitted', 'student', 'intermediate', 'desktop',
      JSON_ARRAY(3, 3, 3, 3, 3, 3, 3, 3, 3, 3), 50,
      JSON_ARRAY(JSON_OBJECT('result', 'success', 'difficulty', 1)), ?)
  `, [campaignId, userId, randomUUID(), openFeedback]);
}

async function insertFeedback({ campaignId, userId, clientSubmissionId, details, expired }) {
  const retentionExpression = expired
    ? 'DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)'
    : 'DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY)';
  await db.query(`
    INSERT INTO feedback_submissions
      (user_id, campaign_id, client_submission_id, data_scope, category, rating,
       details, route_path, status, priority, retention_until)
    VALUES (?, ?, ?, 'pilot', 'bug', 3, ?, '/feedback', 'new', 'normal', ${retentionExpression})
  `, [userId, campaignId, clientSubmissionId, details]);
}

async function insertEvent({ eventId, subjectKey, sessionKey, expired }) {
  const timeExpression = expired
    ? 'DATE_SUB(UTC_TIMESTAMP(), INTERVAL 181 DAY)'
    : 'DATE_SUB(UTC_TIMESTAMP(), INTERVAL 179 DAY)';
  await db.query(`
    INSERT INTO analytics_events
      (event_id, subject_key, session_key, data_scope, event_name, event_version,
       route_path, properties, occurred_at, received_at)
    VALUES (?, ?, ?, 'pilot', 'page_viewed', 1, '/', JSON_OBJECT(),
      ${timeExpression}, ${timeExpression})
  `, [eventId, subjectKey, sessionKey]);
}

async function main() {
  assertE2eSafety({ requireCredentials: true, requireWriteOptIn: true });
  const initial = await runResearchRetentionCleanup(db);
  e2eAssertion(
    expectedCounts(initial.eligible, 0),
    'Refusing retention smoke while unrelated expired E2E records exist',
  );

  const suffix = randomBytes(8).toString('hex');
  const username = `retention_${suffix}`;
  const email = `${username}@example.invalid`;
  const piiCanary = `${email} private-search-${suffix}`;
  const expiredSlug = `retention-expired-${suffix}`;
  const activeSlug = `retention-active-${suffix}`;
  const expiredEventId = randomUUID();
  const activeEventId = randomUUID();
  const expiredFeedbackId = randomUUID();
  const activeFeedbackId = randomUUID();
  let userId = null;
  let operationError = null;
  const cleanupErrors = [];

  try {
    const [userResult] = await db.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, 'not-a-login-credential', 'user')",
      [username, email],
    );
    userId = Number(userResult.insertId);
    const secret = randomBytes(32).toString('hex');
    const subjectKey = createResearchSubjectKey(userId, secret, 1);
    const sessionKey = createResearchSessionKey(subjectKey, randomUUID(), secret, 1);
    await db.query(`
      INSERT INTO analytics_consents
        (user_id, subject_key, key_version, notice_version, status, consented_at)
      VALUES (?, ?, 1, 'e2e-consent-v1', 'active', UTC_TIMESTAMP())
    `, [userId, subjectKey]);

    const expiredCampaignId = await insertCampaign({
      slug: expiredSlug,
      name: 'E2E expired retention fixture',
      userId,
      expired: true,
    });
    const activeCampaignId = await insertCampaign({
      slug: activeSlug,
      name: 'E2E active retention fixture',
      userId,
      expired: false,
    });

    await insertEvaluationResponse({
      campaignId: expiredCampaignId,
      userId,
      openFeedback: piiCanary,
    });
    await insertEvaluationResponse({
      campaignId: activeCampaignId,
      userId,
      openFeedback: 'Active E2E response must survive cleanup',
    });
    await insertFeedback({
      campaignId: expiredCampaignId,
      userId,
      clientSubmissionId: expiredFeedbackId,
      details: piiCanary,
      expired: true,
    });
    await insertFeedback({
      campaignId: activeCampaignId,
      userId,
      clientSubmissionId: activeFeedbackId,
      details: 'Active E2E feedback must survive cleanup',
      expired: false,
    });
    await insertEvent({ eventId: expiredEventId, subjectKey, sessionKey, expired: true });
    await insertEvent({ eventId: activeEventId, subjectKey, sessionKey, expired: false });

    const dryRun = await runResearchRetentionCleanup(db);
    e2eAssertion(expectedCounts(dryRun.eligible, 1), 'Dry-run did not find exactly three expired fixtures');
    e2eAssertion(expectedCounts(dryRun.deleted, 0), 'Dry-run reported deleted rows');
    const dryRunAudit = formatResearchRetentionAudit(dryRun);
    e2eAssertion(!dryRunAudit.includes(piiCanary), 'Dry-run audit leaked a PII canary');
    console.log(dryRunAudit);

    const executed = await runResearchRetentionCleanup(db, { execute: true });
    e2eAssertion(expectedCounts(executed.eligible, 1), 'Execute did not see exactly three expired fixtures');
    e2eAssertion(expectedCounts(executed.deleted, 1), 'Execute did not delete exactly three expired fixtures');
    const executeAudit = formatResearchRetentionAudit(executed);
    e2eAssertion(!executeAudit.includes(piiCanary), 'Execute audit leaked a PII canary');
    console.log(executeAudit);

    const [[survivors]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM analytics_events WHERE event_id = ?) AS expired_event,
        (SELECT COUNT(*) FROM analytics_events WHERE event_id = ?) AS active_event,
        (SELECT COUNT(*) FROM evaluation_responses WHERE campaign_id = ?) AS expired_response,
        (SELECT COUNT(*) FROM evaluation_responses WHERE campaign_id = ?) AS active_response,
        (SELECT COUNT(*) FROM feedback_submissions WHERE client_submission_id = ?) AS expired_feedback,
        (SELECT COUNT(*) FROM feedback_submissions WHERE client_submission_id = ?) AS active_feedback
    `, [
      expiredEventId,
      activeEventId,
      expiredCampaignId,
      activeCampaignId,
      expiredFeedbackId,
      activeFeedbackId,
    ]);
    e2eAssertion(
      Number(survivors.expired_event) === 0
      && Number(survivors.expired_response) === 0
      && Number(survivors.expired_feedback) === 0
      && Number(survivors.active_event) === 1
      && Number(survivors.active_response) === 1
      && Number(survivors.active_feedback) === 1,
      'Retention cleanup deleted the wrong fixture set',
    );

    const repeated = await runResearchRetentionCleanup(db, { execute: true });
    e2eAssertion(expectedCounts(repeated.eligible, 0), 'Repeated cleanup still found expired rows');
    e2eAssertion(expectedCounts(repeated.deleted, 0), 'Repeated cleanup was not idempotent');
  } catch (error) {
    operationError = error;
  } finally {
    if (userId) {
      try {
        await db.query('DELETE FROM users WHERE id = ?', [userId]);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    try {
      await db.query('DELETE FROM evaluation_campaigns WHERE slug IN (?, ?)', [expiredSlug, activeSlug]);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  if (cleanupErrors.length) {
    const error = new Error('E2E retention fixture cleanup failed');
    error.code = 'E2E_CLEANUP_FAILED';
    throw error;
  }
  if (operationError) throw operationError;
  console.log('Research retention E2E smoke passed: dry-run, selective deletion, idempotence, and cleanup.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(formatResearchFailureAudit('research_retention_cleanup', error));
    process.exit(1);
  });
