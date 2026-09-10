export const SUS_ITEM_COUNT = 10;
export const ANALYTICS_MAX_BODY_BYTES = 32 * 1024;
export const ANALYTICS_MAX_BATCH_SIZE = 20;
export const ANALYTICS_MAX_PROPERTIES_BYTES = 1024;

export const CAMPAIGN_STATUSES = Object.freeze(['draft', 'open', 'closed', 'locked']);
export const RESEARCH_DATA_SCOPES = Object.freeze(['pilot', 'production']);
export const ANALYTICS_CONSENT_STATUSES = Object.freeze(['active', 'withdrawn']);
export const EVALUATION_RESPONSE_STATUSES = Object.freeze(['submitted', 'withdrawn']);
export const EVALUATION_TASK_RESULTS = Object.freeze(['success', 'partial', 'failed', 'not_attempted']);
export const FEEDBACK_CATEGORIES = Object.freeze(['bug', 'ux_ui', 'feature', 'content', 'other']);
export const FEEDBACK_STATUSES = Object.freeze(['new', 'reviewing', 'planned', 'resolved', 'declined']);
export const FEEDBACK_PRIORITIES = Object.freeze(['low', 'normal', 'high', 'urgent']);
export const ANALYTICS_OUTCOMES = Object.freeze(['attempt', 'success', 'failure']);
export const ANALYTICS_FAILURE_CODES = Object.freeze([
  'validation',
  'rate_limited',
  'network',
  'server_error',
]);

const feedbackCategorySet = new Set(FEEDBACK_CATEGORIES);
const analyticsOutcomeSet = new Set(ANALYTICS_OUTCOMES);
const analyticsFailureCodeSet = new Set(ANALYTICS_FAILURE_CODES);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const textEncoder = new TextEncoder();

const eventContracts = Object.freeze({
  page_viewed: Object.freeze({}),
  search_performed: Object.freeze({}),
  search_result_opened: Object.freeze({
    resultPosition: (value) => Number.isInteger(value) && value >= 1 && value <= 100,
  }),
  topic_created: Object.freeze({}),
  comment_created: Object.freeze({
    reply: (value) => typeof value === 'boolean',
  }),
  like_changed: Object.freeze({
    active: (value) => typeof value === 'boolean',
  }),
  bookmark_changed: Object.freeze({
    active: (value) => typeof value === 'boolean',
  }),
  category_follow_changed: Object.freeze({
    active: (value) => typeof value === 'boolean',
    category: (value) => ['Hardware', 'Software', 'Network', 'AI & Data', 'General'].includes(value),
  }),
  author_follow_changed: Object.freeze({
    active: (value) => typeof value === 'boolean',
  }),
  feed_viewed: Object.freeze({
    feed: (value) => ['community', 'following', 'for_you'].includes(value),
  }),
  onboarding_completed: Object.freeze({}),
  evaluation_started: Object.freeze({}),
  evaluation_submitted: Object.freeze({}),
  feedback_submitted: Object.freeze({
    category: (value) => feedbackCategorySet.has(value),
  }),
});

export const ANALYTICS_EVENT_NAMES = Object.freeze(Object.keys(eventContracts));

const envelopeFields = new Set([
  'eventId',
  'sessionId',
  'eventName',
  'eventVersion',
  'outcome',
  'failureCode',
  'route',
  'campaignId',
  'properties',
  'occurredAt',
]);

const staticAnalyticsRoutes = new Set([
  '/',
  '/create',
  '/feedback',
  '/help',
  '/leaderboard',
  '/login',
  '/notifications',
  '/privacy',
  '/profile',
  '/profile/edit',
  '/profile/following',
  '/profile/saved',
  '/register',
  '/terms',
  '/admin/analytics',
  '/admin/feedback',
]);

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${label} must be a plain object`);
  }
}

export function calculateSusScore(answers) {
  if (!Array.isArray(answers) || answers.length !== SUS_ITEM_COUNT) {
    throw new Error('SUS requires exactly 10 answers');
  }

  const contribution = answers.reduce((sum, answer, index) => {
    if (!Number.isInteger(answer) || answer < 1 || answer > 5) {
      throw new Error('Each SUS answer must be an integer from 1 to 5');
    }
    return sum + (index % 2 === 0 ? answer - 1 : 5 - answer);
  }, 0);

  return contribution * 2.5;
}

export function summarizeNumericValues(values, { sample = true } = {}) {
  if (!Array.isArray(values) || values.some((value) => !Number.isFinite(value))) {
    throw new Error('Summary values must be finite numbers');
  }
  if (values.length === 0) {
    return {
      count: 0,
      mean: null,
      median: null,
      standardDeviation: null,
      min: null,
      max: null,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / count;
  const midpoint = Math.floor(count / 2);
  const median = count % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
  const divisor = sample ? count - 1 : count;
  const standardDeviation = divisor > 0
    ? Math.sqrt(sorted.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / divisor)
    : null;

  return {
    count,
    mean,
    median,
    standardDeviation,
    min: sorted[0],
    max: sorted[count - 1],
  };
}

export function normalizeFeedbackRoute(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return null;
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return null;

  let parsed;
  try {
    parsed = new URL(candidate, 'https://ithub.invalid');
  } catch {
    return null;
  }
  if (parsed.origin !== 'https://ithub.invalid') return null;
  const pathname = parsed.pathname || '/';
  return pathname.length <= 255 ? pathname : null;
}

export function normalizeAnalyticsRoute(value) {
  const pathname = normalizeFeedbackRoute(value);
  if (!pathname) return null;
  if (pathname === '/topic/[id]' || pathname === '/edit/[id]') return pathname;
  if (/^\/topic\/\d+\/?$/.test(pathname)) return '/topic/[id]';
  if (/^\/edit\/\d+\/?$/.test(pathname)) return '/edit/[id]';
  return staticAnalyticsRoutes.has(pathname) ? pathname : null;
}

export function sanitizeCsvCell(value) {
  const text = value == null ? '' : String(value);
  return /^[\u0000-\u0020]*[=+\-@]/.test(text) || /^[\t\r]/.test(text)
    ? `'${text}`
    : text;
}

export function escapeCsvCell(value) {
  const safe = sanitizeCsvCell(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function validateEventProperties(eventName, properties) {
  assertPlainObject(properties, 'Analytics properties');
  const contract = eventContracts[eventName];
  for (const [key, value] of Object.entries(properties)) {
    const validator = contract[key];
    if (!validator) throw new Error(`Analytics property is not allowed: ${key}`);
    if (!validator(value)) throw new Error(`Invalid analytics property: ${key}`);
  }
  if (textEncoder.encode(JSON.stringify(properties)).byteLength > ANALYTICS_MAX_PROPERTIES_BYTES) {
    throw new Error('Analytics properties exceed the size limit');
  }
  return { ...properties };
}

export function validateAnalyticsEventPayload(payload) {
  assertPlainObject(payload, 'Analytics payload');
  for (const key of Object.keys(payload)) {
    if (!envelopeFields.has(key)) throw new Error(`Analytics field is not allowed: ${key}`);
  }
  if (!uuidPattern.test(payload.eventId || '')) throw new Error('Invalid analytics event id');
  if (!uuidPattern.test(payload.sessionId || '')) throw new Error('Invalid analytics session id');
  if (!Object.hasOwn(eventContracts, payload.eventName)) throw new Error('Invalid analytics event name');
  if (payload.eventVersion !== 1) throw new Error('Invalid analytics event version');

  const outcome = payload.outcome == null ? null : payload.outcome;
  if (outcome !== null && !analyticsOutcomeSet.has(outcome)) throw new Error('Invalid analytics outcome');
  const failureCode = payload.failureCode == null ? null : payload.failureCode;
  if (failureCode !== null && !analyticsFailureCodeSet.has(failureCode)) {
    throw new Error('Invalid analytics failure code');
  }
  if (outcome === 'failure' && failureCode === null) throw new Error('A failure code is required');
  if (outcome !== 'failure' && failureCode !== null) throw new Error('A failure code requires failure outcome');

  const route = normalizeAnalyticsRoute(payload.route);
  if (!route) throw new Error('Invalid analytics route');

  let campaignId = null;
  if (payload.campaignId != null) {
    campaignId = Number(payload.campaignId);
    if (!Number.isInteger(campaignId) || campaignId <= 0) throw new Error('Invalid analytics campaign id');
  }

  let occurredAt = null;
  if (payload.occurredAt != null) {
    if (typeof payload.occurredAt !== 'string') throw new Error('Invalid analytics event time');
    const timestamp = Date.parse(payload.occurredAt);
    if (!Number.isFinite(timestamp)) throw new Error('Invalid analytics event time');
    occurredAt = new Date(timestamp).toISOString();
  }

  return {
    eventId: payload.eventId.toLowerCase(),
    sessionId: payload.sessionId.toLowerCase(),
    eventName: payload.eventName,
    eventVersion: payload.eventVersion,
    outcome,
    failureCode,
    route,
    campaignId,
    properties: validateEventProperties(payload.eventName, payload.properties ?? {}),
    occurredAt,
  };
}
