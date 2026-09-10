import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  deriveResearchPilotAccountAliases,
  evaluateResearchPilotReadiness,
  RESEARCH_PILOT_DECISION_IDS,
} from '../../scripts/research-pilot-readiness-core.mjs';
import { RESEARCH_PREVIEW_BRANCH } from '../../scripts/research-preview-config-core.mjs';

const approvedAt = '2026-09-10T02:00:00.000Z';
const currentCommit = '0123456789abcdef0123456789abcdef01234567';
const participantCodes = Object.freeze(['P01', 'P02', 'P03', 'P04', 'P05']);

function approvals(status = 'approved_for_pilot') {
  return Object.fromEntries(RESEARCH_PILOT_DECISION_IDS.map((decisionId, index) => [
    decisionId,
    {
      status,
      approvedByCode: `ADV${String(index + 1).padStart(2, '0')}`,
      approvedAt: status === 'approved_for_pilot' ? approvedAt : '',
    },
  ]));
}

function readyConfig() {
  return {
    schemaVersion: 1,
    branch: RESEARCH_PREVIEW_BRANCH,
    target: 'preview',
    database: 'test_e2e',
    previewEvidence: {
      deploymentId: 'dpl_12345678901234567890',
      immutableUrl: 'https://it-pilot-ready.vercel.app',
      sourceCommit: currentCommit,
      state: 'READY',
      vercelTarget: null,
      branchVariableCount: 29,
      authenticationProtected: true,
      verifiedAt: approvedAt,
    },
    campaign: {
      slug: 'pilot-2569-round-a',
      displayLabel: 'ITHub Research Pilot Round A',
      dataScope: 'pilot',
      questionnaireVersion: 'sus-th-pilot-v1',
      evaluationNoticeVersion: 'research-notice-pilot-v1',
      analyticsNoticeVersion: 'research-analytics-pilot-v1',
      eligibleMemberCount: 5,
      startsAt: '2026-09-15T02:00:00.000Z',
      endsAt: '2026-09-15T05:00:00.000Z',
      retentionUntil: '2027-09-15T05:00:00.000Z',
    },
    participants: [...participantCodes],
    approvals: approvals(),
    owners: {
      incidentOwnerCode: 'OPS01',
      retentionOwnerCode: 'DATA01',
      exportOwnerCode: 'EXPORT01',
    },
    accessibility: {
      nvdaTesterCode: 'A11Y01',
      voiceOverTesterCode: 'A11Y02',
    },
    quietWindowConfirmed: true,
    externalServicesDisabledConfirmed: true,
    finalApprovalAfterPilotRequired: true,
  };
}

const safeContext = Object.freeze({
  branch: RESEARCH_PREVIEW_BRANCH,
  currentCommit,
  databaseName: 'test_e2e',
  projectTargetVerified: true,
  now: new Date('2026-09-10T03:00:00.000Z'),
});

test('marks a fully approved isolated Pilot configuration ready', () => {
  const report = evaluateResearchPilotReadiness(readyConfig(), safeContext);
  assert.equal(report.status, 'ready');
  assert.equal(report.failures.length, 0);
  assert.equal(report.campaign.participantCount, 5);
  assert.equal(report.campaign.eligibleMemberCount, 5);
  assert.equal(report.approvedDecisionCount, RESEARCH_PILOT_DECISION_IDS.length);
  assert.deepEqual(report.accountAliases[0], {
    participantCode: 'P01',
    username: 'pilot_p01',
    email: 'pilot.p01@example.invalid',
  });
});

test('blocks pending approvals, missing owners, and an unconfirmed quiet window', () => {
  const config = readyConfig();
  config.approvals = approvals('pending');
  config.owners.incidentOwnerCode = '';
  config.accessibility.nvdaTesterCode = '';
  config.quietWindowConfirmed = false;
  const report = evaluateResearchPilotReadiness(config, safeContext);
  assert.equal(report.status, 'blocked');
  assert.equal(report.approvedDecisionCount, 0);
  assert.equal(report.failures.includes('approval_susTranslation'), true);
  assert.equal(report.failures.includes('owner_incidentOwnerCode'), true);
  assert.equal(report.failures.includes('accessibility_nvdaTesterCode'), true);
  assert.equal(report.failures.includes('quiet_window'), true);
});

test('blocks Production-shaped targets, unsafe versions, and participant mismatch', () => {
  const config = readyConfig();
  config.target = 'production';
  config.database = 'production';
  config.campaign.dataScope = 'production';
  config.campaign.questionnaireVersion = 'unreviewed-v2';
  config.campaign.eligibleMemberCount = 6;
  config.participants = ['P01', 'P02', 'P04', 'P03', 'P05'];
  const report = evaluateResearchPilotReadiness(config, {
    ...safeContext,
    branch: 'main',
    databaseName: 'production',
    projectTargetVerified: false,
  });
  for (const failure of [
    'preview_target',
    'config_database',
    'current_database',
    'current_branch',
    'preview_project',
    'campaign_scope',
    'questionnaire_version',
    'participant_codes',
    'eligible_snapshot',
  ]) {
    assert.equal(report.failures.includes(failure), true, failure);
  }
});

test('binds readiness to the exact protected Preview deployment evidence', () => {
  const config = readyConfig();
  config.previewEvidence = {
    ...config.previewEvidence,
    deploymentId: 'invalid-deployment',
    immutableUrl: 'https://it-pilot-ready.vercel.app/?_vercel_share=do-not-store',
    sourceCommit: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
    state: 'ERROR',
    vercelTarget: 'production',
    branchVariableCount: 28,
    authenticationProtected: false,
    verifiedAt: '2026-09-10T04:00:00.000Z',
  };
  const report = evaluateResearchPilotReadiness(config, safeContext);
  for (const failure of [
    'preview_deployment_id',
    'preview_immutable_url',
    'preview_source_commit',
    'preview_state',
    'preview_vercel_target',
    'preview_branch_variables',
    'preview_authentication',
    'preview_verified_in_future',
  ]) {
    assert.equal(report.failures.includes(failure), true, failure);
  }
  assert.throws(
    () => evaluateResearchPilotReadiness({
      ...readyConfig(),
      previewEvidence: { ...readyConfig().previewEvidence, shareToken: 'do-not-store' },
    }, safeContext),
    /unsupported fields: shareToken/,
  );
});

test('rejects PII-shaped labels, unsafe dates, and unsupported config fields', () => {
  const config = readyConfig();
  config.campaign.displayLabel = 'student@example.com';
  config.campaign.endsAt = '2026-09-14T05:00:00.000Z';
  config.campaign.retentionUntil = '2028-09-15T05:00:00.000Z';
  const report = evaluateResearchPilotReadiness(config, safeContext);
  assert.equal(report.failures.includes('campaign_label'), true);
  assert.equal(report.failures.includes('campaign_window'), true);
  assert.equal(report.failures.includes('retention_over_one_year'), true);

  assert.throws(
    () => evaluateResearchPilotReadiness({ ...readyConfig(), password: 'do-not-store' }, safeContext),
    /unsupported fields: password/,
  );
});

test('derives only fixed synthetic account aliases from participant codes', () => {
  assert.deepEqual(deriveResearchPilotAccountAliases(['P09', 'P10']), [
    { participantCode: 'P09', username: 'pilot_p09', email: 'pilot.p09@example.invalid' },
    { participantCode: 'P10', username: 'pilot_p10', email: 'pilot.p10@example.invalid' },
  ]);
  assert.throws(() => deriveResearchPilotAccountAliases(['P11']), /Invalid Pilot participant code/);
});

test('keeps the committed Pilot config example intentionally blocked', async () => {
  const templateUrl = new URL(
    '../../.md/features/ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_CONFIG.example.json',
    import.meta.url,
  );
  const template = JSON.parse(await readFile(templateUrl, 'utf8'));
  const report = evaluateResearchPilotReadiness(template, safeContext);
  assert.equal(report.status, 'blocked');
  assert.equal(report.approvedDecisionCount, 0);
  assert.equal(report.failures.includes('preview_deployment_id'), true);
  assert.equal(report.failures.includes('preview_source_commit'), true);
  assert.equal(report.failures.includes('preview_state'), true);
  assert.equal(report.failures.includes('approval_susTranslation'), true);
  assert.equal(report.failures.includes('owner_incidentOwnerCode'), true);
  assert.equal(report.failures.includes('accessibility_nvdaTesterCode'), true);
  assert.equal(report.failures.includes('quiet_window'), true);
  assert.equal(report.failures.includes('external_services_review'), true);
});
