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
