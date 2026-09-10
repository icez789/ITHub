import {
  PILOT_EVALUATION_NOTICE_VERSION,
  PILOT_QUESTIONNAIRE_VERSION,
} from '../lib/researchWorkflowCore.js';
import { PILOT_ANALYTICS_NOTICE_VERSION } from '../lib/researchQuestionnaire.js';
import { RESEARCH_PREVIEW_BRANCH } from './research-preview-config-core.mjs';

export const RESEARCH_PILOT_CONFIG_VERSION = 1;
export const RESEARCH_PILOT_DECISION_IDS = Object.freeze([
  'susTranslation',
  'eligiblePopulation',
  'analyticsScope',
  'sessionDefinition',
  'observedTasks',
  'evaluationWithdrawal',
  'openTextPolicy',
  'statistics',
  'retention',
  'hmacOwnership',
  'noticeVersions',
]);

const rootFields = Object.freeze([
  'schemaVersion',
  'branch',
  'target',
  'database',
  'previewEvidence',
  'campaign',
  'participants',
  'approvals',
  'owners',
  'accessibility',
  'quietWindowConfirmed',
  'externalServicesDisabledConfirmed',
  'finalApprovalAfterPilotRequired',
]);
const previewEvidenceFields = Object.freeze([
  'deploymentId',
  'immutableUrl',
  'sourceCommit',
  'state',
  'vercelTarget',
  'branchVariableCount',
  'authenticationProtected',
  'verifiedAt',
]);
const campaignFields = Object.freeze([
  'slug',
  'displayLabel',
  'dataScope',
  'questionnaireVersion',
  'evaluationNoticeVersion',
  'analyticsNoticeVersion',
  'eligibleMemberCount',
  'startsAt',
  'endsAt',
  'retentionUntil',
]);
const approvalFields = Object.freeze(['status', 'approvedByCode', 'approvedAt']);
const ownerFields = Object.freeze(['incidentOwnerCode', 'retentionOwnerCode', 'exportOwnerCode']);
const accessibilityFields = Object.freeze(['nvdaTesterCode', 'voiceOverTesterCode']);
const operatorCodePattern = /^[A-Z][A-Z0-9_-]{2,31}$/;
const pilotSlugPattern = /^pilot-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const utcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const deploymentIdPattern = /^dpl_[A-Za-z0-9]{20,64}$/;
const immutablePreviewUrlPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
const gitCommitPattern = /^[a-f0-9]{40}$/;
const oneYearMilliseconds = 366 * 24 * 60 * 60 * 1000;

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function assertPlainObject(value, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be a plain object`);
  return value;
}

function assertExactFields(value, allowedFields, label) {
  const allowed = new Set(allowedFields);
  const unexpected = Object.keys(value).filter((field) => !allowed.has(field));
  if (unexpected.length > 0) {
    throw new Error(`${label} contains unsupported fields: ${unexpected.sort().join(', ')}`);
  }
}

function utcDate(value) {
  if (typeof value !== 'string' || !utcTimestampPattern.test(value)) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function validOperatorCode(value) {
  return operatorCodePattern.test(String(value ?? ''));
}

function expectedParticipantCodes(count) {
  return Array.from({ length: count }, (_, index) => `P${String(index + 1).padStart(2, '0')}`);
}

function hasPiiShape(value) {
  const text = String(value ?? '');
  return /@|https?:\/\/|\b\d{8,}\b|[\r\n]/i.test(text);
}

function appendFailure(failures, condition, code) {
  if (condition) failures.push(code);
}

export function deriveResearchPilotAccountAliases(participantCodes) {
  if (!Array.isArray(participantCodes)) throw new Error('Participant codes must be an array');
  return participantCodes.map((code) => {
    if (!/^P(?:0[1-9]|10)$/.test(code)) throw new Error('Invalid Pilot participant code');
    const suffix = code.toLowerCase();
    return Object.freeze({
      participantCode: code,
      username: `pilot_${suffix}`,
      email: `pilot.${suffix}@example.invalid`,
    });
  });
}

export function evaluateResearchPilotReadiness(config, context = {}) {
  assertPlainObject(config, 'Pilot config');
  assertExactFields(config, rootFields, 'Pilot config');
  const previewEvidence = assertPlainObject(config.previewEvidence, 'Pilot Preview evidence');
  const campaign = assertPlainObject(config.campaign, 'Pilot campaign');
  const approvals = assertPlainObject(config.approvals, 'Pilot approvals');
  const owners = assertPlainObject(config.owners, 'Pilot owners');
  const accessibility = assertPlainObject(config.accessibility, 'Pilot accessibility plan');
  assertExactFields(previewEvidence, previewEvidenceFields, 'Pilot Preview evidence');
  assertExactFields(campaign, campaignFields, 'Pilot campaign');
  assertExactFields(approvals, RESEARCH_PILOT_DECISION_IDS, 'Pilot approvals');
  assertExactFields(owners, ownerFields, 'Pilot owners');
  assertExactFields(accessibility, accessibilityFields, 'Pilot accessibility plan');

  const failures = [];
  appendFailure(failures, config.schemaVersion !== RESEARCH_PILOT_CONFIG_VERSION, 'config_version');
  appendFailure(failures, config.branch !== RESEARCH_PREVIEW_BRANCH, 'config_branch');
  appendFailure(failures, context.branch !== RESEARCH_PREVIEW_BRANCH, 'current_branch');
  appendFailure(failures, config.target !== 'preview', 'preview_target');
  appendFailure(failures, config.database !== 'test_e2e', 'config_database');
  appendFailure(failures, context.databaseName !== 'test_e2e', 'current_database');
  appendFailure(failures, context.projectTargetVerified !== true, 'preview_project');

  const currentCommit = String(context.currentCommit ?? '').trim().toLowerCase();
  const sourceCommit = String(previewEvidence.sourceCommit ?? '').trim().toLowerCase();
  const verifiedAt = utcDate(previewEvidence.verifiedAt);
  appendFailure(failures, !gitCommitPattern.test(currentCommit), 'current_commit');
  appendFailure(
    failures,
    !deploymentIdPattern.test(String(previewEvidence.deploymentId ?? '')),
    'preview_deployment_id',
  );
  appendFailure(
    failures,
    !immutablePreviewUrlPattern.test(String(previewEvidence.immutableUrl ?? '')),
    'preview_immutable_url',
  );
  appendFailure(
    failures,
    !gitCommitPattern.test(sourceCommit) || sourceCommit !== currentCommit,
    'preview_source_commit',
  );
  appendFailure(failures, previewEvidence.state !== 'READY', 'preview_state');
  appendFailure(failures, previewEvidence.vercelTarget !== null, 'preview_vercel_target');
  appendFailure(
    failures,
    previewEvidence.branchVariableCount !== 29,
    'preview_branch_variables',
  );
  appendFailure(
    failures,
    previewEvidence.authenticationProtected !== true,
    'preview_authentication',
  );
  appendFailure(failures, verifiedAt === null, 'preview_verified_at_utc');

  const displayLabel = String(campaign.displayLabel ?? '').trim();
  appendFailure(
    failures,
    displayLabel.length < 3 || displayLabel.length > 120 || hasPiiShape(displayLabel),
    'campaign_label',
  );
  appendFailure(
    failures,
    typeof campaign.slug !== 'string' || !pilotSlugPattern.test(campaign.slug),
    'campaign_slug',
  );
  appendFailure(failures, campaign.dataScope !== 'pilot', 'campaign_scope');
  appendFailure(
    failures,
    campaign.questionnaireVersion !== PILOT_QUESTIONNAIRE_VERSION,
    'questionnaire_version',
  );
  appendFailure(
    failures,
    campaign.evaluationNoticeVersion !== PILOT_EVALUATION_NOTICE_VERSION,
    'evaluation_notice_version',
  );
  appendFailure(
    failures,
    campaign.analyticsNoticeVersion !== PILOT_ANALYTICS_NOTICE_VERSION,
    'analytics_notice_version',
  );

  const participantCodes = Array.isArray(config.participants) ? config.participants : [];
  const participantCount = participantCodes.length;
  const eligibleMemberCount = Number(campaign.eligibleMemberCount);
  appendFailure(
    failures,
    participantCount < 5 || participantCount > 10,
    'participant_count',
  );
  const expectedCodes = expectedParticipantCodes(participantCount);
  appendFailure(
    failures,
    participantCodes.some((code) => typeof code !== 'string')
      || new Set(participantCodes).size !== participantCount
      || participantCodes.some((code, index) => code !== expectedCodes[index]),
    'participant_codes',
  );
  appendFailure(
    failures,
    !Number.isInteger(eligibleMemberCount)
      || eligibleMemberCount !== participantCount
      || eligibleMemberCount < 5
      || eligibleMemberCount > 10,
    'eligible_snapshot',
  );

  const startsAt = utcDate(campaign.startsAt);
  const endsAt = utcDate(campaign.endsAt);
  const retentionUntil = utcDate(campaign.retentionUntil);
  appendFailure(failures, startsAt === null, 'campaign_start_utc');
  appendFailure(failures, endsAt === null, 'campaign_end_utc');
  appendFailure(failures, retentionUntil === null, 'retention_utc');
  if (startsAt && endsAt) appendFailure(failures, endsAt <= startsAt, 'campaign_window');
  if (endsAt && retentionUntil) {
    appendFailure(failures, retentionUntil < endsAt, 'retention_before_end');
    appendFailure(
      failures,
      retentionUntil.getTime() - endsAt.getTime() > oneYearMilliseconds,
      'retention_over_one_year',
    );
  }

  let approvedDecisionCount = 0;
  const now = context.now instanceof Date ? context.now : new Date();
  if (verifiedAt) {
    appendFailure(
      failures,
      verifiedAt.getTime() > now.getTime() + (5 * 60 * 1000),
      'preview_verified_in_future',
    );
  }
  for (const decisionId of RESEARCH_PILOT_DECISION_IDS) {
    const approval = approvals[decisionId];
    if (!isPlainObject(approval)) {
      failures.push(`approval_${decisionId}`);
      continue;
    }
    assertExactFields(approval, approvalFields, `Pilot approval ${decisionId}`);
    const approvedAt = utcDate(approval.approvedAt);
    const complete = approval.status === 'approved_for_pilot'
      && validOperatorCode(approval.approvedByCode)
      && approvedAt !== null
      && approvedAt.getTime() <= now.getTime() + (5 * 60 * 1000);
    if (complete) approvedDecisionCount += 1;
    else failures.push(`approval_${decisionId}`);
  }

  for (const field of ownerFields) {
    appendFailure(failures, !validOperatorCode(owners[field]), `owner_${field}`);
  }
  for (const field of accessibilityFields) {
    appendFailure(failures, !validOperatorCode(accessibility[field]), `accessibility_${field}`);
  }
  appendFailure(failures, config.quietWindowConfirmed !== true, 'quiet_window');
  appendFailure(
    failures,
    config.externalServicesDisabledConfirmed !== true,
    'external_services_review',
  );
  appendFailure(
    failures,
    config.finalApprovalAfterPilotRequired !== true,
    'final_approval_boundary',
  );

  const uniqueFailures = [...new Set(failures)].sort();
  const aliases = participantCodes.every((code) => /^P(?:0[1-9]|10)$/.test(code))
    ? deriveResearchPilotAccountAliases(participantCodes)
    : [];

  return Object.freeze({
    status: uniqueFailures.length === 0 ? 'ready' : 'blocked',
    branch: context.branch || null,
    database: context.databaseName || null,
    preview: Object.freeze({
      deploymentId: deploymentIdPattern.test(String(previewEvidence.deploymentId ?? ''))
        ? previewEvidence.deploymentId
        : null,
      immutableUrl: immutablePreviewUrlPattern.test(String(previewEvidence.immutableUrl ?? ''))
        ? previewEvidence.immutableUrl
        : null,
      sourceCommit: gitCommitPattern.test(sourceCommit) ? sourceCommit : null,
      currentCommit: gitCommitPattern.test(currentCommit) ? currentCommit : null,
      state: previewEvidence.state === 'READY' ? 'READY' : null,
      vercelTarget: previewEvidence.vercelTarget ?? null,
      branchVariableCount: Number.isInteger(previewEvidence.branchVariableCount)
        ? previewEvidence.branchVariableCount
        : null,
      authenticationProtected: previewEvidence.authenticationProtected === true,
      verifiedAt: verifiedAt?.toISOString() ?? null,
    }),
    campaign: Object.freeze({
      slug: pilotSlugPattern.test(String(campaign.slug ?? '')) ? campaign.slug : null,
      participantCount,
      eligibleMemberCount: Number.isInteger(eligibleMemberCount) ? eligibleMemberCount : null,
      startsAt: startsAt?.toISOString() ?? null,
      endsAt: endsAt?.toISOString() ?? null,
      retentionUntil: retentionUntil?.toISOString() ?? null,
    }),
    approvedDecisionCount,
    requiredDecisionCount: RESEARCH_PILOT_DECISION_IDS.length,
    participantCodes: Object.freeze(
      participantCodes.filter((code) => /^P(?:0[1-9]|10)$/.test(code)),
    ),
    accountAliases: Object.freeze(aliases),
    failures: Object.freeze(uniqueFailures),
  });
}
