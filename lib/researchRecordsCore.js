import { randomUUID } from 'node:crypto';

import {
  PILOT_EVALUATION_NOTICE_VERSION,
  PILOT_QUESTIONNAIRE_VERSION,
  assertCampaignReadyToOpen,
  assertCampaignTransition,
  validateCampaignDraft,
  validateEvaluationSubmission,
  validateFeedbackSubmission,
  validateFeedbackTriage,
} from './researchWorkflowCore.js';

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`Invalid ${label}`);
  return number;
}

function utcSqlDate(value) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return null;
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function isDuplicateEntry(error) {
  return error?.code === 'ER_DUP_ENTRY' || Number(error?.errno) === 1062;
}

async function inTransaction(database, operation) {
  const connection = await database.getConnection();
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

async function writeAdminAudit(connection, {
  actorId,
  action,
  targetType,
  targetId,
  metadata,
}) {
  await connection.query(
    `INSERT INTO moderation_audit_logs
       (actor_id, action, target_type, target_id, metadata, request_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      positiveInteger(actorId, 'audit actor id'),
      action,
      targetType,
      String(targetId),
      JSON.stringify(metadata),
      randomUUID(),
    ],
  );
}

function campaignRowForOpening(row) {
  const databaseDate = (value) => {
    if (value == null) return null;
    return value instanceof Date ? value : new Date(value);
  };
  return {
    status: row.status,
    dataScope: row.data_scope,
    questionnaireVersion: row.questionnaire_version,
    consentNoticeVersion: row.consent_notice_version,
    eligibleMemberCount: row.eligible_member_count == null
      ? null
      : Number(row.eligible_member_count),
    startsAt: databaseDate(row.starts_at),
    endsAt: databaseDate(row.ends_at),
    retentionUntil: databaseDate(row.retention_until),
  };
}

export async function createCampaignRecord(database, actorId, rawInput) {
  const input = validateCampaignDraft(rawInput);
  const safeActorId = positiveInteger(actorId, 'campaign actor id');
  return inTransaction(database, async (connection) => {
    const [result] = await connection.query(
      `INSERT INTO evaluation_campaigns
         (slug, name, status, data_scope, questionnaire_version, consent_notice_version,
          eligible_member_count, starts_at, ends_at, retention_until, created_by, updated_by)
       VALUES (?, ?, 'draft', 'pilot', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.slug,
        input.name,
        input.questionnaireVersion,
        input.consentNoticeVersion,
        input.eligibleMemberCount,
        utcSqlDate(input.startsAt),
        utcSqlDate(input.endsAt),
        utcSqlDate(input.retentionUntil),
        safeActorId,
        safeActorId,
      ],
    );
    const campaignId = Number(result.insertId);
    await writeAdminAudit(connection, {
      actorId: safeActorId,
      action: 'research.campaign.create',
      targetType: 'research_campaign',
      targetId: campaignId,
      metadata: { status: 'draft', dataScope: 'pilot' },
    });
    return { campaignId, status: 'draft', dataScope: 'pilot' };
  });
}

export async function updateDraftCampaignRecord(database, actorId, campaignId, rawInput) {
  const input = validateCampaignDraft(rawInput);
  const safeActorId = positiveInteger(actorId, 'campaign actor id');
  const safeCampaignId = positiveInteger(campaignId, 'campaign id');
  return inTransaction(database, async (connection) => {
    const [rows] = await connection.query(
      'SELECT id, status FROM evaluation_campaigns WHERE id = ? LIMIT 1 FOR UPDATE',
      [safeCampaignId],
    );
    if (!rows[0]) return { status: 'not_found' };
    if (rows[0].status !== 'draft') return { status: 'immutable' };

    await connection.query(
      `UPDATE evaluation_campaigns
       SET slug = ?, name = ?, data_scope = 'pilot', questionnaire_version = ?,
           consent_notice_version = ?, eligible_member_count = ?, starts_at = ?, ends_at = ?,
           retention_until = ?, updated_by = ?
       WHERE id = ?`,
      [
        input.slug,
        input.name,
        input.questionnaireVersion,
        input.consentNoticeVersion,
        input.eligibleMemberCount,
        utcSqlDate(input.startsAt),
        utcSqlDate(input.endsAt),
        utcSqlDate(input.retentionUntil),
        safeActorId,
        safeCampaignId,
      ],
    );
    await writeAdminAudit(connection, {
      actorId: safeActorId,
      action: 'research.campaign.update',
      targetType: 'research_campaign',
      targetId: safeCampaignId,
      metadata: {
        status: 'draft',
        changedFields: [
          'slug',
          'name',
          'questionnaireVersion',
          'consentNoticeVersion',
          'eligibleMemberCount',
          'startsAt',
          'endsAt',
          'retentionUntil',
        ],
      },
    });
    return { status: 'updated', campaignId: safeCampaignId };
  });
}

export async function transitionCampaignRecord(database, actorId, campaignId, nextStatus) {
  const safeActorId = positiveInteger(actorId, 'campaign actor id');
  const safeCampaignId = positiveInteger(campaignId, 'campaign id');
  return inTransaction(database, async (connection) => {
    const [rows] = await connection.query(
      `SELECT id, status, data_scope, questionnaire_version, consent_notice_version,
              eligible_member_count, starts_at, ends_at, retention_until
       FROM evaluation_campaigns WHERE id = ? LIMIT 1 FOR UPDATE`,
      [safeCampaignId],
    );
    const campaign = rows[0];
    if (!campaign) return { status: 'not_found' };
    const targetStatus = assertCampaignTransition(campaign.status, nextStatus);
    if (targetStatus === 'open') assertCampaignReadyToOpen(campaignRowForOpening(campaign));
    const timestampColumn = {
      open: 'opened_at',
      closed: 'closed_at',
      locked: 'locked_at',
    }[targetStatus];
    await connection.query(
      `UPDATE evaluation_campaigns
       SET status = ?, ${timestampColumn} = UTC_TIMESTAMP(), updated_by = ?
       WHERE id = ?`,
      [targetStatus, safeActorId, safeCampaignId],
    );
    await writeAdminAudit(connection, {
      actorId: safeActorId,
      action: `research.campaign.${targetStatus}`,
      targetType: 'research_campaign',
      targetId: safeCampaignId,
      metadata: { fromStatus: campaign.status, toStatus: targetStatus, dataScope: 'pilot' },
    });
    return { status: targetStatus, campaignId: safeCampaignId };
  });
}

export async function submitEvaluationRecord(database, userId, rawInput) {
  const input = validateEvaluationSubmission(rawInput);
  const safeUserId = positiveInteger(userId, 'evaluation user id');
  return inTransaction(database, async (connection) => {
    const [campaignRows] = await connection.query(
      `SELECT id, status, data_scope, questionnaire_version, consent_notice_version,
              starts_at <= UTC_TIMESTAMP() AS has_started,
              ends_at >= UTC_TIMESTAMP() AS has_not_ended
       FROM evaluation_campaigns WHERE id = ? LIMIT 1 FOR UPDATE`,
      [input.campaignId],
    );
    const campaign = campaignRows[0];
    if (!campaign || campaign.status !== 'open' || campaign.data_scope !== 'pilot'
      || campaign.questionnaire_version !== PILOT_QUESTIONNAIRE_VERSION
      || campaign.consent_notice_version !== PILOT_EVALUATION_NOTICE_VERSION
      || !Boolean(campaign.has_started) || !Boolean(campaign.has_not_ended)) {
      return { status: 'campaign_unavailable' };
    }
    const [existingRows] = await connection.query(
      `SELECT id, client_submission_id, response_status
       FROM evaluation_responses
       WHERE campaign_id = ? AND user_id = ? LIMIT 1 FOR UPDATE`,
      [input.campaignId, safeUserId],
    );
    const existing = existingRows[0];
    if (existing) {
      return {
        status: existing.response_status === 'withdrawn' ? 'withdrawn_locked' : 'already_submitted',
        evaluationId: Number(existing.id),
        idempotent: existing.client_submission_id === input.clientSubmissionId,
      };
    }

    try {
      const [result] = await connection.query(
        `INSERT INTO evaluation_responses
           (campaign_id, user_id, client_submission_id, response_status, respondent_type,
            experience_level, primary_device, sus_answers, sus_score, task_results, open_feedback)
         VALUES (?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.campaignId,
          safeUserId,
          input.clientSubmissionId,
          input.respondentType,
          input.experienceLevel,
          input.primaryDevice,
          JSON.stringify(input.susAnswers),
          input.susScore,
          JSON.stringify(input.taskResults),
          input.openFeedback,
        ],
      );
      return { status: 'submitted', evaluationId: Number(result.insertId), idempotent: false };
    } catch (error) {
      if (!isDuplicateEntry(error)) throw error;
      const [duplicateRows] = await connection.query(
        `SELECT id, client_submission_id, response_status
         FROM evaluation_responses WHERE campaign_id = ? AND user_id = ? LIMIT 1`,
        [input.campaignId, safeUserId],
      );
      const duplicate = duplicateRows[0];
      if (!duplicate) throw error;
      return {
        status: duplicate.response_status === 'withdrawn' ? 'withdrawn_locked' : 'already_submitted',
        evaluationId: Number(duplicate.id),
        idempotent: duplicate.client_submission_id === input.clientSubmissionId,
      };
    }
  });
}

export async function withdrawEvaluationRecord(database, userId, campaignId) {
  const safeUserId = positiveInteger(userId, 'evaluation user id');
  const safeCampaignId = positiveInteger(campaignId, 'campaign id');
  return inTransaction(database, async (connection) => {
    const [rows] = await connection.query(
      `SELECT id, response_status FROM evaluation_responses
       WHERE campaign_id = ? AND user_id = ? LIMIT 1 FOR UPDATE`,
      [safeCampaignId, safeUserId],
    );
    const response = rows[0];
    if (!response) return { status: 'not_found' };
    if (response.response_status === 'withdrawn') {
      return { status: 'withdrawn', evaluationId: Number(response.id), changed: false };
    }
    await connection.query(
      `UPDATE evaluation_responses
       SET response_status = 'withdrawn', respondent_type = NULL, experience_level = NULL,
           primary_device = NULL, sus_answers = NULL, sus_score = NULL, task_results = NULL,
           open_feedback = NULL, withdrawn_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [response.id],
    );
    return { status: 'withdrawn', evaluationId: Number(response.id), changed: true };
  });
}

export async function submitFeedbackRecord(database, userId, rawInput) {
  const input = validateFeedbackSubmission(rawInput);
  const safeUserId = positiveInteger(userId, 'feedback user id');
  return inTransaction(database, async (connection) => {
    if (input.campaignId) {
      const [campaignRows] = await connection.query(
        `SELECT id, status, data_scope, retention_until,
                starts_at <= UTC_TIMESTAMP() AS has_started,
                ends_at >= UTC_TIMESTAMP() AS has_not_ended
         FROM evaluation_campaigns WHERE id = ? LIMIT 1 FOR UPDATE`,
        [input.campaignId],
      );
      const campaign = campaignRows[0];
      if (!campaign || campaign.status !== 'open' || campaign.data_scope !== 'pilot'
        || !campaign.retention_until || !Boolean(campaign.has_started)
        || !Boolean(campaign.has_not_ended)) {
        return { status: 'campaign_unavailable' };
      }
    }

    const [existingRows] = await connection.query(
      `SELECT id FROM feedback_submissions
       WHERE user_id = ? AND client_submission_id = ? LIMIT 1 FOR UPDATE`,
      [safeUserId, input.clientSubmissionId],
    );
    if (existingRows[0]) {
      return { status: 'submitted', feedbackId: Number(existingRows[0].id), idempotent: true };
    }

    const retentionSql = input.campaignId
      ? '(SELECT retention_until FROM evaluation_campaigns WHERE id = ?)'
      : 'DATE_ADD(UTC_TIMESTAMP(), INTERVAL 365 DAY)';
    const params = [
      safeUserId,
      input.campaignId,
      input.clientSubmissionId,
      input.category,
      input.rating,
      input.details,
      input.routePath,
    ];
    if (input.campaignId) params.push(input.campaignId);
    try {
      const [result] = await connection.query(
        `INSERT INTO feedback_submissions
           (user_id, campaign_id, client_submission_id, data_scope, category, rating,
            details, route_path, status, priority, retention_until)
         VALUES (?, ?, ?, 'pilot', ?, ?, ?, ?, 'new', 'normal', ${retentionSql})`,
        params,
      );
      return { status: 'submitted', feedbackId: Number(result.insertId), idempotent: false };
    } catch (error) {
      if (!isDuplicateEntry(error)) throw error;
      const [duplicateRows] = await connection.query(
        'SELECT id FROM feedback_submissions WHERE user_id = ? AND client_submission_id = ? LIMIT 1',
        [safeUserId, input.clientSubmissionId],
      );
      if (!duplicateRows[0]) throw error;
      return { status: 'submitted', feedbackId: Number(duplicateRows[0].id), idempotent: true };
    }
  });
}

export async function updateFeedbackTriageRecord(database, actorId, feedbackId, rawInput) {
  const safeActorId = positiveInteger(actorId, 'feedback actor id');
  const safeFeedbackId = positiveInteger(feedbackId, 'feedback id');
  return inTransaction(database, async (connection) => {
    const [rows] = await connection.query(
      `SELECT id, status, priority, issue_theme, internal_note
       FROM feedback_submissions WHERE id = ? LIMIT 1 FOR UPDATE`,
      [safeFeedbackId],
    );
    const current = rows[0];
    if (!current) return { status: 'not_found' };
    const input = validateFeedbackTriage(rawInput, { currentStatus: current.status });
    const terminal = ['resolved', 'declined'].includes(input.status);
    await connection.query(
      `UPDATE feedback_submissions
       SET status = ?, priority = ?, issue_theme = ?, internal_note = ?, updated_by = ?,
           resolved_at = CASE
             WHEN ? = 1 THEN COALESCE(resolved_at, UTC_TIMESTAMP())
             ELSE NULL
           END
       WHERE id = ?`,
      [
        input.status,
        input.priority,
        input.issueTheme,
        input.internalNote,
        safeActorId,
        terminal ? 1 : 0,
        safeFeedbackId,
      ],
    );
    await writeAdminAudit(connection, {
      actorId: safeActorId,
      action: 'research.feedback.triage',
      targetType: 'research_feedback',
      targetId: safeFeedbackId,
      metadata: {
        fromStatus: current.status,
        toStatus: input.status,
        priority: input.priority,
        issueTheme: input.issueTheme,
        internalNoteChanged: (current.internal_note || null) !== input.internalNote,
      },
    });
    return {
      status: 'updated',
      feedbackId: safeFeedbackId,
      feedbackStatus: input.status,
      priority: input.priority,
      issueTheme: input.issueTheme,
    };
  });
}

export async function listOpenCampaignRecords(database) {
  const [rows] = await database.query(
    `SELECT id, name, questionnaire_version, consent_notice_version, ends_at
     FROM evaluation_campaigns
     WHERE status = 'open' AND data_scope = 'pilot'
       AND questionnaire_version = ? AND consent_notice_version = ?
       AND starts_at <= UTC_TIMESTAMP() AND ends_at >= UTC_TIMESTAMP()
     ORDER BY ends_at ASC, id ASC`,
    [PILOT_QUESTIONNAIRE_VERSION, PILOT_EVALUATION_NOTICE_VERSION],
  );
  return rows.map((row) => ({
    campaignId: Number(row.id),
    name: row.name,
    questionnaireVersion: row.questionnaire_version,
    consentNoticeVersion: row.consent_notice_version,
    endsAt: row.ends_at,
  }));
}

export async function listAdminCampaignRecords(database) {
  const [rows] = await database.query(
    `SELECT id, slug, name, status, data_scope, questionnaire_version,
            consent_notice_version, eligible_member_count, starts_at, ends_at,
            retention_until, opened_at, closed_at, locked_at, created_at, updated_at
     FROM evaluation_campaigns
     ORDER BY created_at DESC, id DESC`,
  );
  return rows.map((row) => ({
    campaignId: Number(row.id),
    slug: row.slug,
    name: row.name,
    status: row.status,
    dataScope: row.data_scope,
    questionnaireVersion: row.questionnaire_version,
    consentNoticeVersion: row.consent_notice_version,
    eligibleMemberCount: row.eligible_member_count == null
      ? null
      : Number(row.eligible_member_count),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    retentionUntil: row.retention_until,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    lockedAt: row.locked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function listMyEvaluationRecords(database, userId) {
  const safeUserId = positiveInteger(userId, 'evaluation user id');
  const [rows] = await database.query(
    `SELECT r.id, r.campaign_id, r.response_status, r.sus_score, r.submitted_at, r.withdrawn_at,
            c.name AS campaign_name
     FROM evaluation_responses r
     INNER JOIN evaluation_campaigns c ON c.id = r.campaign_id
     WHERE r.user_id = ?
     ORDER BY r.submitted_at DESC, r.id DESC`,
    [safeUserId],
  );
  return rows.map((row) => ({
    evaluationId: Number(row.id),
    campaignId: Number(row.campaign_id),
    campaignName: row.campaign_name,
    status: row.response_status,
    susScore: row.sus_score == null ? null : Number(row.sus_score),
    submittedAt: row.submitted_at,
    withdrawnAt: row.withdrawn_at,
  }));
}

export async function listMyFeedbackRecords(database, userId) {
  const safeUserId = positiveInteger(userId, 'feedback user id');
  const [rows] = await database.query(
    `SELECT id, category, rating, route_path, status, created_at, resolved_at
     FROM feedback_submissions WHERE user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [safeUserId],
  );
  return rows.map((row) => ({
    feedbackId: Number(row.id),
    category: row.category,
    rating: row.rating == null ? null : Number(row.rating),
    routePath: row.route_path,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));
}

export async function listAdminFeedbackRecords(database, { limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(100, positiveInteger(limit, 'feedback page size'));
  const safeOffset = Number(offset);
  if (!Number.isInteger(safeOffset) || safeOffset < 0) throw new Error('Invalid feedback offset');
  const [rows] = await database.query(
    `SELECT id, campaign_id, data_scope, category, rating, details, route_path, status,
            priority, issue_theme, internal_note, created_at, updated_at, resolved_at
     FROM feedback_submissions
     ORDER BY FIELD(priority, 'urgent', 'high', 'normal', 'low'), created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset],
  );
  return rows.map((row) => ({
    feedbackId: Number(row.id),
    campaignId: row.campaign_id == null ? null : Number(row.campaign_id),
    dataScope: row.data_scope,
    category: row.category,
    rating: row.rating == null ? null : Number(row.rating),
    details: row.details,
    routePath: row.route_path,
    status: row.status,
    priority: row.priority,
    issueTheme: row.issue_theme,
    internalNote: row.internal_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  }));
}
