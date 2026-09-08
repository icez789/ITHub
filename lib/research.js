import 'server-only';

import { requireAdmin, requireSuperAdmin, requireUser } from './auth';
import { enforceRateLimit } from './rateLimit';
import { validateAnalyticsBatchPayload } from './researchAnalyticsCore';
import { insertAnalyticsEventRecords } from './researchAnalyticsRecordsCore';
import {
  getAnalyticsConsentState,
  grantAnalyticsConsent,
  withdrawAnalyticsConsent,
} from './researchConsent';
import db from './db';
import { createSessionKeyForSubject } from './researchPrivacy';
import {
  buildResearchExportFiles,
  createStoredZip,
} from './researchExportCore';
import {
  ResearchMetricFilterError,
  buildResearchMetrics,
  validateResearchMetricFilters,
} from './researchMetricsCore';
import { loadResearchMetricDataset } from './researchMetricsRecordsCore';
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
} from './researchRecordsCore';

export async function getMemberResearchOverview() {
  const user = await requireUser();
  const [campaigns, evaluations, feedback, consent] = await Promise.all([
    listOpenCampaignRecords(db),
    listMyEvaluationRecords(db, Number(user.id)),
    listMyFeedbackRecords(db, Number(user.id)),
    getAnalyticsConsentState(Number(user.id)),
  ]);
  return { campaigns, evaluations, feedback, consent };
}

export async function getResearchCampaignsForAdmin() {
  await requireAdmin();
  return listAdminCampaignRecords(db);
}

function selectMetricCampaign(campaigns, filters) {
  if (filters.campaignId != null) {
    const selected = campaigns.find((campaign) => campaign.campaignId === filters.campaignId);
    if (!selected) throw new ResearchMetricFilterError('Campaign was not found', 'campaign_not_found');
    return selected;
  }
  return campaigns.find((campaign) => (
    campaign.dataScope === 'pilot' && campaign.startsAt && campaign.endsAt && campaign.status !== 'draft'
  )) ?? campaigns.find((campaign) => (
    campaign.dataScope === 'pilot' && campaign.startsAt && campaign.endsAt
  )) ?? null;
}

async function metricResultForCampaigns(campaigns, rawFilters, { now = new Date() } = {}) {
  const filters = validateResearchMetricFilters(rawFilters);
  const campaign = selectMetricCampaign(campaigns, filters);
  if (!campaign) return { campaigns, metrics: null, filterError: null };
  let effectiveFilters = rawFilters;
  if (filters.campaignId == null) {
    if (rawFilters instanceof URLSearchParams) {
      effectiveFilters = new URLSearchParams(rawFilters);
      effectiveFilters.set('campaign', String(campaign.campaignId));
    } else {
      effectiveFilters = { ...rawFilters, campaign: String(campaign.campaignId) };
    }
  }
  const dataset = await loadResearchMetricDataset(db, campaign, effectiveFilters, { now });
  return { campaigns, metrics: buildResearchMetrics(dataset), filterError: null };
}

export async function getResearchAnalyticsForAdmin(rawFilters = {}) {
  await requireAdmin();
  const campaigns = await listAdminCampaignRecords(db);
  try {
    return await metricResultForCampaigns(campaigns, rawFilters);
  } catch (error) {
    if (error instanceof ResearchMetricFilterError) {
      return {
        campaigns,
        metrics: null,
        filterError: { code: error.code, message: 'ตัวกรองไม่ถูกต้อง กรุณาเลือกข้อมูลใหม่' },
      };
    }
    throw error;
  }
}

export async function createResearchChapterExport(rawFilters = {}) {
  await requireAdmin();
  const generatedAt = new Date();
  const campaigns = await listAdminCampaignRecords(db);
  const result = await metricResultForCampaigns(campaigns, rawFilters, { now: generatedAt });
  if (!result.metrics) {
    throw new ResearchMetricFilterError('A campaign is required for export', 'campaign_unavailable');
  }
  const files = buildResearchExportFiles(result.metrics, { generatedAt });
  const archive = createStoredZip(files, { timestamp: generatedAt });
  const slug = result.metrics.campaign.slug.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '') || 'campaign';
  return {
    archive,
    fileName: `ithub-research-${slug}-${generatedAt.toISOString().slice(0, 10)}.zip`,
  };
}

export async function getResearchFeedbackForAdmin(options) {
  await requireAdmin();
  return listAdminFeedbackRecords(db, options);
}

export async function createResearchCampaign(input) {
  const user = await requireSuperAdmin();
  await enforceRateLimit(`research-campaign:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 });
  return createCampaignRecord(db, Number(user.id), input);
}

export async function updateResearchCampaign(campaignId, input) {
  const user = await requireSuperAdmin();
  await enforceRateLimit(`research-campaign:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 });
  return updateDraftCampaignRecord(db, Number(user.id), campaignId, input);
}

export async function transitionResearchCampaign(campaignId, nextStatus) {
  const user = await requireSuperAdmin();
  await enforceRateLimit(`research-campaign:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 });
  return transitionCampaignRecord(db, Number(user.id), campaignId, nextStatus);
}

export async function submitResearchEvaluation(input) {
  const user = await requireUser();
  await enforceRateLimit(`research-evaluation:${user.id}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  return submitEvaluationRecord(db, Number(user.id), input);
}

export async function withdrawResearchEvaluation(campaignId) {
  const user = await requireUser();
  await enforceRateLimit(`research-evaluation:${user.id}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  return withdrawEvaluationRecord(db, Number(user.id), campaignId);
}

export async function submitResearchFeedback(input) {
  const user = await requireUser();
  await enforceRateLimit(`research-feedback:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  return submitFeedbackRecord(db, Number(user.id), input);
}

export async function triageResearchFeedback(feedbackId, input) {
  const user = await requireAdmin();
  await enforceRateLimit(`research-feedback-triage:${user.id}`, { limit: 60, windowMs: 60 * 1000 });
  return updateFeedbackTriageRecord(db, Number(user.id), feedbackId, input);
}

export async function grantResearchAnalyticsConsent(noticeVersion) {
  const user = await requireUser();
  await enforceRateLimit(`research-consent:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  return grantAnalyticsConsent(Number(user.id), noticeVersion);
}

export async function withdrawResearchAnalyticsConsent() {
  const user = await requireUser();
  await enforceRateLimit(`research-consent:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  return withdrawAnalyticsConsent(Number(user.id));
}

export async function getResearchAnalyticsBootstrap() {
  const user = await requireUser();
  const consent = await getAnalyticsConsentState(Number(user.id));
  return { enabled: consent.status === 'active' };
}

export async function ingestResearchAnalyticsBatch(payload) {
  const user = await requireUser();
  await enforceRateLimit(`research-analytics:${user.id}`, { limit: 60, windowMs: 60 * 1000 });
  const events = validateAnalyticsBatchPayload(payload);
  return insertAnalyticsEventRecords(db, Number(user.id), events, {
    createSessionKey: createSessionKeyForSubject,
  });
}
