import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSusScore,
  escapeCsvCell,
  normalizeAnalyticsRoute,
  normalizeFeedbackRoute,
  sanitizeCsvCell,
  summarizeNumericValues,
  validateAnalyticsEventPayload,
} from '../../lib/researchShared.js';

test('calculates SUS from the original alternating item directions', () => {
  assert.equal(calculateSusScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
  assert.equal(calculateSusScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
  assert.equal(calculateSusScore(Array(10).fill(3)), 50);
});

test('rejects incomplete or out-of-range SUS answers', () => {
  assert.throws(() => calculateSusScore([1, 2, 3]), /exactly 10/);
  assert.throws(() => calculateSusScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 0]), /integer from 1 to 5/);
  assert.throws(() => calculateSusScore([5, 1, 5, 1, 5, 1, 5, 1, 5, '1']), /integer from 1 to 5/);
});

test('summarizes numeric results with sample standard deviation', () => {
  assert.deepEqual(summarizeNumericValues([0, 50, 100]), {
    count: 3,
    mean: 50,
    median: 50,
    standardDeviation: 50,
    min: 0,
    max: 100,
  });
  assert.deepEqual(summarizeNumericValues([]), {
    count: 0,
    mean: null,
    median: null,
    standardDeviation: null,
    min: null,
    max: null,
  });
  assert.throws(() => summarizeNumericValues([1, Number.NaN]), /finite numbers/);
});

test('normalizes routes without retaining query strings, hashes, or dynamic ids', () => {
  assert.equal(normalizeFeedbackRoute('/feedback?email=person@example.com#form'), '/feedback');
  assert.equal(normalizeFeedbackRoute('/topic/123?draft=private'), '/topic/123');
  assert.equal(normalizeAnalyticsRoute('/topic/123?draft=private'), '/topic/[id]');
  assert.equal(normalizeAnalyticsRoute('/edit/456'), '/edit/[id]');
  assert.equal(normalizeAnalyticsRoute(normalizeAnalyticsRoute('/topic/123')), '/topic/[id]');
  assert.equal(normalizeAnalyticsRoute(normalizeAnalyticsRoute('/edit/456')), '/edit/[id]');
  assert.equal(normalizeAnalyticsRoute('/admin/analytics?campaign=4'), '/admin/analytics');
  assert.equal(normalizeFeedbackRoute('https://example.com/private'), null);
  assert.equal(normalizeFeedbackRoute('//example.com/private'), null);
  assert.equal(normalizeAnalyticsRoute('/not-allowlisted'), null);
});

test('validates allowlisted analytics envelopes and strips route identifiers', () => {
  const event = validateAnalyticsEventPayload({
    eventId: '018f7781-2196-7c47-a1c2-a0f1366f1ea9',
    sessionId: '018f7781-2196-7c47-a1c2-a0f1366f1eaa',
    eventName: 'feed_viewed',
    eventVersion: 1,
    route: '/?feed=for-you',
    properties: { feed: 'for_you' },
  });

  assert.deepEqual(event, {
    eventId: '018f7781-2196-7c47-a1c2-a0f1366f1ea9',
    sessionId: '018f7781-2196-7c47-a1c2-a0f1366f1eaa',
    eventName: 'feed_viewed',
    eventVersion: 1,
    outcome: null,
    failureCode: null,
    route: '/',
    campaignId: null,
    properties: { feed: 'for_you' },
    occurredAt: null,
  });
});

test('rejects analytics payloads that can carry PII or invalid failures', () => {
  const base = {
    eventId: '018f7781-2196-7c47-a1c2-a0f1366f1ea9',
    sessionId: '018f7781-2196-7c47-a1c2-a0f1366f1eaa',
    eventName: 'search_performed',
    eventVersion: 1,
    route: '/',
    properties: {},
  };

  assert.throws(
    () => validateAnalyticsEventPayload({ ...base, properties: { query: 'secret search' } }),
    /property is not allowed/,
  );
  assert.throws(
    () => validateAnalyticsEventPayload({ ...base, email: 'person@example.com' }),
    /field is not allowed/,
  );
  assert.throws(
    () => validateAnalyticsEventPayload({ ...base, eventName: 'unknown_event' }),
    /event name/,
  );
  assert.throws(
    () => validateAnalyticsEventPayload({
      ...base,
      eventName: 'topic_created',
      outcome: 'failure',
      failureCode: 'database_password',
    }),
    /failure code/,
  );
});

test('sanitizes spreadsheet formulas before RFC 4180 escaping', () => {
  for (const value of ['=1+1', '+SUM(A1:A2)', '-2+3', '@cmd', '\t=1', '\r=1', '  =1']) {
    assert.equal(sanitizeCsvCell(value).startsWith("'"), true);
  }
  assert.equal(sanitizeCsvCell('normal text'), 'normal text');
  assert.equal(escapeCsvCell('a,"b"'), '"a,""b"""');
  assert.equal(escapeCsvCell('=1+1'), "'=1+1");
});
