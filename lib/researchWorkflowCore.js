import {
  CAMPAIGN_STATUSES,
  EVALUATION_TASK_RESULTS,
  FEEDBACK_CATEGORIES,
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  calculateSusScore,
  normalizeFeedbackRoute,
} from './researchShared.js';
import { isAdminRole, isSuperAdminRole, isKnownRole } from './roles.js';

export const RESEARCH_RESPONDENT_TYPES = Object.freeze(['student', 'teacher', 'other']);
export const RESEARCH_EXPERIENCE_LEVELS = Object.freeze(['beginner', 'intermediate', 'advanced']);
export const RESEARCH_PRIMARY_DEVICES = Object.freeze(['mobile', 'tablet', 'desktop']);
export const PILOT_QUESTIONNAIRE_VERSION = 'sus-th-pilot-v1';
export const PILOT_EVALUATION_NOTICE_VERSION = 'research-notice-pilot-v1';
export const FEEDBACK_ISSUE_THEMES = Object.freeze([
  'navigation',
  'search',
  'content_creation',
  'engagement',
  'personalization',
  'performance',
  'accessibility',
  'other',
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const versionPattern = /^[a-zA-Z0-9._-]{1,64}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const feedbackTransitions = Object.freeze({
  new: new Set(['new', 'reviewing', 'planned', 'resolved', 'declined']),
  reviewing: new Set(['reviewing', 'planned', 'resolved', 'declined']),
  planned: new Set(['planned', 'reviewing', 'resolved', 'declined']),
  resolved: new Set(['resolved']),
  declined: new Set(['declined']),
});
const campaignTransitions = Object.freeze({
  draft: new Set(['open']),
  open: new Set(['closed']),
  closed: new Set(['locked']),
  locked: new Set(),
});
const oneYearMilliseconds = 366 * 24 * 60 * 60 * 1000;

function requiredTrimmedText(value, label, { min = 1, max = 255 } = {}) {
  const text = String(value ?? '').trim();
  if (text.length < min || text.length > max) {
    throw new Error(`${label} must be between ${min} and ${max} characters`);
  }
  return text;
}

function optionalTrimmedText(value, label, max) {
  if (value == null || String(value).trim() === '') return null;
  return requiredTrimmedText(value, label, { max });
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`Invalid ${label}`);
  return number;
}

function optionalNonNegativeInteger(value, label) {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`Invalid ${label}`);
  return number;
}

function integerInRange(value, label, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}`);
  }
  return number;
}

function optionalDate(value, label) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid ${label}`);
  return date;
}

function allowedValue(value, allowed, label) {
  const normalized = String(value ?? '');
  if (!allowed.includes(normalized)) throw new Error(`Invalid ${label}`);
  return normalized;
}

function clientSubmissionId(value) {
  const id = String(value ?? '').toLowerCase();
  if (!uuidPattern.test(id)) throw new Error('Invalid client submission id');
  return id;
}

export function validateCampaignDraft(input) {
  const slug = requiredTrimmedText(input?.slug, 'Campaign slug', { max: 100 }).toLowerCase();
  if (!slugPattern.test(slug)) throw new Error('Invalid campaign slug');
  const name = requiredTrimmedText(input?.name, 'Campaign name', { min: 3, max: 191 });
  const dataScope = String(input?.dataScope ?? 'pilot');
  if (dataScope !== 'pilot') throw new Error('Only pilot campaigns are enabled');
  const questionnaireVersion = String(input?.questionnaireVersion ?? '');
  const consentNoticeVersion = String(input?.consentNoticeVersion ?? '');
  if (!versionPattern.test(questionnaireVersion)) throw new Error('Invalid questionnaire version');
  if (!versionPattern.test(consentNoticeVersion)) throw new Error('Invalid consent notice version');

  const startsAt = optionalDate(input?.startsAt, 'campaign start');
  const endsAt = optionalDate(input?.endsAt, 'campaign end');
  const retentionUntil = optionalDate(input?.retentionUntil, 'campaign retention deadline');
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new Error('Campaign end must be after its start');
  }
  if (endsAt && retentionUntil && retentionUntil < endsAt) {
    throw new Error('Campaign retention deadline must be on or after its end');
  }
  if (endsAt && retentionUntil && retentionUntil.getTime() - endsAt.getTime() > oneYearMilliseconds) {
    throw new Error('Campaign retention deadline cannot exceed one year after its end');
  }

  return {
    slug,
    name,
    dataScope,
    questionnaireVersion,
    consentNoticeVersion,
    eligibleMemberCount: optionalNonNegativeInteger(
      input?.eligibleMemberCount,
      'eligible member count',
    ),
    startsAt,
    endsAt,
    retentionUntil,
  };
}

export function assertCampaignReadyToOpen(campaign) {
  if (campaign?.status !== 'draft') throw new Error('Only a draft campaign can be opened');
  if (!Number.isInteger(campaign.eligibleMemberCount) || campaign.eligibleMemberCount <= 0) {
    throw new Error('Campaign needs a positive eligible-member snapshot before opening');
  }
  if (!(campaign.startsAt instanceof Date) || !(campaign.endsAt instanceof Date)
    || !(campaign.retentionUntil instanceof Date)) {
    throw new Error('Campaign dates are required before opening');
  }
  if (campaign.endsAt <= campaign.startsAt || campaign.retentionUntil < campaign.endsAt) {
    throw new Error('Campaign dates are not ready for opening');
  }
  if (campaign.dataScope !== 'pilot') throw new Error('Only pilot campaigns are enabled');
  if (campaign.questionnaireVersion !== PILOT_QUESTIONNAIRE_VERSION) {
    throw new Error('Campaign questionnaire version is not supported by this pilot UI');
  }
  if (campaign.consentNoticeVersion !== PILOT_EVALUATION_NOTICE_VERSION) {
    throw new Error('Campaign consent notice version is not supported by this pilot UI');
  }
  return campaign;
}

export function assertCampaignTransition(currentStatus, nextStatus) {
  if (!CAMPAIGN_STATUSES.includes(currentStatus) || !CAMPAIGN_STATUSES.includes(nextStatus)) {
    throw new Error('Invalid campaign transition');
  }
  if (!campaignTransitions[currentStatus].has(nextStatus)) {
    throw new Error(`Invalid campaign transition from ${currentStatus} to ${nextStatus}`);
  }
  return nextStatus;
}

export function validateEvaluationSubmission(input) {
  if (input?.consentAcknowledged !== true) {
    throw new Error('Evaluation consent must be acknowledged');
  }
  const susAnswers = Array.isArray(input?.susAnswers)
    ? input.susAnswers.map((value, index) => integerInRange(value, `SUS answer ${index + 1}`, 1, 5))
    : input?.susAnswers;
  const susScore = calculateSusScore(susAnswers);
  if (!Array.isArray(input?.taskResults) || input.taskResults.length !== 5) {
    throw new Error('Evaluation requires exactly 5 task results');
  }
  const taskResults = input.taskResults.map((task, index) => {
    const taskId = positiveInteger(task?.taskId, `task ${index + 1} id`);
    if (taskId !== index + 1) throw new Error('Evaluation task ids must be ordered from 1 to 5');
    const result = allowedValue(task?.result, EVALUATION_TASK_RESULTS, `task ${taskId} result`);
    const difficulty = task?.difficulty == null || task.difficulty === ''
      ? null
      : integerInRange(task.difficulty, `task ${taskId} difficulty`, 1, 5);
    if (result === 'not_attempted' && difficulty !== null) {
      throw new Error('A not-attempted task cannot have a difficulty score');
    }
    if (result !== 'not_attempted' && difficulty === null) {
      throw new Error('An attempted task requires a difficulty score');
    }
    return { taskId, result, difficulty };
  });

  return {
    campaignId: positiveInteger(input?.campaignId, 'campaign id'),
    clientSubmissionId: clientSubmissionId(input?.clientSubmissionId),
    respondentType: allowedValue(
      input?.respondentType,
      RESEARCH_RESPONDENT_TYPES,
      'respondent type',
    ),
    experienceLevel: allowedValue(
      input?.experienceLevel,
      RESEARCH_EXPERIENCE_LEVELS,
      'experience level',
    ),
    primaryDevice: allowedValue(
      input?.primaryDevice,
      RESEARCH_PRIMARY_DEVICES,
      'primary device',
    ),
    susAnswers,
    susScore,
    taskResults,
    openFeedback: optionalTrimmedText(input?.openFeedback, 'Open feedback', 2_000),
  };
}

export function validateFeedbackSubmission(input) {
  const routePath = normalizeFeedbackRoute(input?.route);
  if (!routePath) throw new Error('Invalid feedback route');
  const rating = input?.rating == null || input.rating === ''
    ? null
    : integerInRange(input.rating, 'Feedback rating', 1, 5);
  return {
    campaignId: input?.campaignId == null || input.campaignId === ''
      ? null
      : positiveInteger(input.campaignId, 'feedback campaign id'),
    clientSubmissionId: clientSubmissionId(input?.clientSubmissionId),
    category: allowedValue(input?.category, FEEDBACK_CATEGORIES, 'feedback category'),
    rating,
    details: requiredTrimmedText(input?.details, 'Feedback details', { min: 10, max: 2_000 }),
    routePath,
  };
}

export function validateFeedbackTriage(input, { currentStatus } = {}) {
  const status = allowedValue(input?.status, FEEDBACK_STATUSES, 'feedback status');
  if (!feedbackTransitions[currentStatus]?.has(status)) {
    if (['resolved', 'declined'].includes(currentStatus)) {
      throw new Error('A terminal feedback record cannot be reopened');
    }
    throw new Error('Invalid feedback status transition');
  }
  const issueTheme = input?.issueTheme == null || input.issueTheme === ''
    ? null
    : allowedValue(input.issueTheme, FEEDBACK_ISSUE_THEMES, 'feedback issue theme');
  return {
    status,
    priority: allowedValue(input?.priority, FEEDBACK_PRIORITIES, 'feedback priority'),
    issueTheme,
    internalNote: optionalTrimmedText(input?.internalNote, 'Internal note', 2_000),
  };
}

export function assertResearchRole(user, requiredRole) {
  if (!user || !Number.isInteger(Number(user.id)) || !isKnownRole(user.role)) {
    throw new Error('Unauthorized');
  }
  if (requiredRole === 'member') return user;
  if (requiredRole === 'admin' && isAdminRole(user.role)) return user;
  if (requiredRole === 'super_admin' && isSuperAdminRole(user.role)) return user;
  if (!['member', 'admin', 'super_admin'].includes(requiredRole)) {
    throw new Error('Invalid research role requirement');
  }
  throw new Error('Forbidden');
}
