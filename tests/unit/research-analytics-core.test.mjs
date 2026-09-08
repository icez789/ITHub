import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANALYTICS_MAX_EVENT_AGE_MS,
  ANALYTICS_MAX_FUTURE_SKEW_MS,
  AnalyticsPayloadError,
  isSameOriginAnalyticsRequest,
  resolveResearchAnalyticsEnabled,
  validateAnalyticsBatchPayload,
} from '../../lib/researchAnalyticsCore.js';

const now = new Date('2026-09-08T12:00:00.000Z');
const baseEvent = {
  eventId: '018f7781-2196-7c47-a1c2-a0f1366f1ea9',
  sessionId: '018f7781-2196-7c47-a1c2-a0f1366f1eaa',
  eventName: 'page_viewed',
  eventVersion: 1,
  route: '/topic/42?private=value',
  properties: {},
};

test('validates an analytics batch, normalizes routes, and supplies server time', () => {
  const [event] = validateAnalyticsBatchPayload({ events: [baseEvent] }, { now });
  assert.equal(event.route, '/topic/[id]');
  assert.equal(event.occurredAt, now.toISOString());
  assert.equal(event.campaignId, null);
});

test('accepts only bounded event times and requires campaign context for evaluation events', () => {
  const oldestAccepted = new Date(now.getTime() - ANALYTICS_MAX_EVENT_AGE_MS).toISOString();
  const newestAccepted = new Date(now.getTime() + ANALYTICS_MAX_FUTURE_SKEW_MS).toISOString();
  assert.equal(validateAnalyticsBatchPayload({ events: [{ ...baseEvent, occurredAt: oldestAccepted }] }, { now })[0].occurredAt, oldestAccepted);
  assert.equal(validateAnalyticsBatchPayload({ events: [{ ...baseEvent, occurredAt: newestAccepted }] }, { now })[0].occurredAt, newestAccepted);

  assert.throws(
    () => validateAnalyticsBatchPayload({ events: [{ ...baseEvent, occurredAt: new Date(now.getTime() - ANALYTICS_MAX_EVENT_AGE_MS - 1).toISOString() }] }, { now }),
    AnalyticsPayloadError,
  );
  assert.throws(
    () => validateAnalyticsBatchPayload({ events: [{ ...baseEvent, eventName: 'evaluation_started' }] }, { now }),
    /campaign id/,
  );
  assert.doesNotThrow(() => validateAnalyticsBatchPayload({
    events: [{ ...baseEvent, eventName: 'evaluation_started', campaignId: 7 }],
  }, { now }));
});

test('rejects malformed batches and authority or PII-shaped fields', () => {
  assert.throws(() => validateAnalyticsBatchPayload({ events: [], userId: 42 }, { now }), AnalyticsPayloadError);
  assert.throws(() => validateAnalyticsBatchPayload({ events: [] }, { now }), AnalyticsPayloadError);
  assert.throws(
    () => validateAnalyticsBatchPayload({ events: Array.from({ length: 21 }, () => baseEvent) }, { now }),
    AnalyticsPayloadError,
  );
  for (const extra of [
    { userId: 42 },
    { subjectKey: 'a'.repeat(64) },
    { email: 'private@example.com' },
    { searchQuery: 'private search' },
  ]) {
    assert.throws(
      () => validateAnalyticsBatchPayload({ events: [{ ...baseEvent, ...extra }] }, { now }),
      AnalyticsPayloadError,
    );
  }
});

test('requires the exact request origin and rejects cross-site fetch metadata', () => {
  assert.equal(isSameOriginAnalyticsRequest({
    requestUrl: 'https://ithub.example/api/analytics/events',
    requestHost: 'ithub.example',
    origin: 'https://ithub.example',
    referer: null,
    secFetchSite: 'same-origin',
  }), true);
  assert.equal(isSameOriginAnalyticsRequest({
    requestUrl: 'https://internal-host/api/analytics/events',
    requestHost: 'ithub.example',
    origin: null,
    referer: 'https://ithub.example/feedback?local=value',
    secFetchSite: null,
  }), true);
  assert.equal(isSameOriginAnalyticsRequest({
    requestUrl: 'https://ithub.example/api/analytics/events',
    requestHost: 'ithub.example',
    origin: 'https://attacker.example',
    referer: 'https://ithub.example/feedback',
    secFetchSite: 'cross-site',
  }), false);
  assert.equal(isSameOriginAnalyticsRequest({
    requestUrl: 'https://ithub.example/api/analytics/events',
    requestHost: 'ithub.example',
    origin: 'https://ithub.example/path',
    referer: null,
    secFetchSite: 'same-origin',
  }), false);
  assert.equal(isSameOriginAnalyticsRequest({
    requestUrl: 'https://ithub.example/api/analytics/events',
    requestHost: 'ithub.example',
    origin: null,
    referer: null,
    secFetchSite: null,
  }), false);
});

test('fails closed when the consent bootstrap is absent, false, or unavailable', async () => {
  assert.equal(await resolveResearchAnalyticsEnabled(async () => ({ enabled: true })), true);
  assert.equal(await resolveResearchAnalyticsEnabled(async () => ({ enabled: false })), false);
  assert.equal(await resolveResearchAnalyticsEnabled(async () => null), false);
  assert.equal(await resolveResearchAnalyticsEnabled(async () => { throw new Error('database unavailable'); }), false);
});
