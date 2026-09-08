import {
  ANALYTICS_MAX_BATCH_SIZE,
  validateAnalyticsEventPayload,
} from './researchShared.js';

export const ANALYTICS_MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000;
export const ANALYTICS_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export class AnalyticsPayloadError extends Error {
  constructor(message = 'Invalid analytics payload') {
    super(message);
    this.name = 'AnalyticsPayloadError';
  }
}

function fail(message) {
  throw new AnalyticsPayloadError(message);
}

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

export function validateAnalyticsBatchPayload(payload, { now = new Date() } = {}) {
  if (!isPlainObject(payload)) fail('Analytics batch must be a plain object');
  if (Object.keys(payload).some((key) => key !== 'events')) {
    fail('Analytics batch contains an unknown field');
  }
  if (!Array.isArray(payload.events) || payload.events.length === 0) {
    fail('Analytics batch must contain at least one event');
  }
  if (payload.events.length > ANALYTICS_MAX_BATCH_SIZE) {
    fail('Analytics batch exceeds the event limit');
  }

  const receivedAt = now instanceof Date ? new Date(now) : new Date(now);
  if (!Number.isFinite(receivedAt.getTime())) fail('Invalid server time');
  const minimumTime = receivedAt.getTime() - ANALYTICS_MAX_EVENT_AGE_MS;
  const maximumTime = receivedAt.getTime() + ANALYTICS_MAX_FUTURE_SKEW_MS;

  try {
    return payload.events.map((rawEvent) => {
      const event = validateAnalyticsEventPayload(rawEvent);
      const occurredAt = event.occurredAt == null
        ? new Date(receivedAt)
        : new Date(event.occurredAt);
      if (occurredAt.getTime() < minimumTime || occurredAt.getTime() > maximumTime) {
        fail('Analytics event time is outside the accepted window');
      }
      if (
        (event.eventName === 'evaluation_started' || event.eventName === 'evaluation_submitted')
        && event.campaignId == null
      ) {
        fail('Evaluation analytics require a campaign id');
      }
      return { ...event, occurredAt: occurredAt.toISOString() };
    });
  } catch (error) {
    if (error instanceof AnalyticsPayloadError) throw error;
    throw new AnalyticsPayloadError('Invalid analytics event');
  }
}

export function isSameOriginAnalyticsRequest({ requestUrl, requestHost, origin, referer, secFetchSite }) {
  if (typeof requestUrl !== 'string') return false;
  try {
    const parsedRequestUrl = new URL(requestUrl);
    const allowedOrigins = new Set([parsedRequestUrl.origin]);
    if (typeof requestHost === 'string' && /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(requestHost)) {
      allowedOrigins.add(new URL(`${parsedRequestUrl.protocol}//${requestHost}`).origin);
    }
    if (typeof origin === 'string' && origin.trim()) {
      const suppliedOrigin = origin.trim();
      const parsedOrigin = new URL(suppliedOrigin);
      if (suppliedOrigin !== parsedOrigin.origin || !allowedOrigins.has(parsedOrigin.origin)) return false;
    } else {
      if (typeof referer !== 'string' || !referer.trim()) return false;
      if (!allowedOrigins.has(new URL(referer).origin)) return false;
    }
  } catch {
    return false;
  }

  return secFetchSite == null || secFetchSite === '' || secFetchSite === 'same-origin';
}

export async function resolveResearchAnalyticsEnabled(loadBootstrap) {
  try {
    const result = await loadBootstrap();
    return result?.enabled === true;
  } catch {
    return false;
  }
}
