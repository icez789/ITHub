import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RESEARCH_MIN_GROUP_SIZE,
  ResearchMetricFilterError,
  buildResearchMetrics,
  resolveResearchMetricWindow,
  validateResearchMetricFilters,
} from '../../lib/researchMetricsCore.js';

const campaign = {
  campaignId: 7,
  slug: 'pilot-round',
  name: 'Pilot round',
  status: 'open',
  dataScope: 'pilot',
  eligibleMemberCount: 10,
  startsAt: new Date('2026-09-01T06:00:00.000Z'),
  endsAt: new Date('2026-09-30T06:00:00.000Z'),
};

function evaluation(index, respondentType = 'student') {
  return {
    respondentType,
    experienceLevel: index % 2 === 0 ? 'intermediate' : 'advanced',
    primaryDevice: index % 2 === 0 ? 'desktop' : 'mobile',
    susScore: 50 + (index * 10),
    taskResults: [1, 2, 3, 4, 5].map((taskId) => ({
      taskId,
      result: taskId === 5 && index === 0 ? 'not_attempted' : 'success',
    })),
  };
}

function dataset(count = RESEARCH_MIN_GROUP_SIZE) {
  const filters = validateResearchMetricFilters({ campaign: '7' });
  const window = resolveResearchMetricWindow(filters, campaign, {
    now: new Date('2026-09-15T00:00:00.000Z'),
  });
  return {
    campaign,
    filters,
    window,
    consentCount: count,
    evaluations: Array.from({ length: count }, (_, index) => evaluation(index)),
    analytics: {
      subjectCount: count,
      sessionCount: count + 1,
      totalEvents: 40,
      searchNumerator: 4,
      searchDenominator: 5,
      eventCounts: [
        { eventName: 'topic_created', outcome: 'attempt', feed: null, active: null, count: 5 },
        { eventName: 'topic_created', outcome: 'success', feed: null, active: null, count: 4 },
        { eventName: 'comment_created', outcome: 'attempt', feed: null, active: null, count: 5 },
        { eventName: 'comment_created', outcome: 'success', feed: null, active: null, count: 5 },
        { eventName: 'like_changed', outcome: null, feed: null, active: true, count: 3 },
        { eventName: 'feed_viewed', outcome: null, feed: 'for_you', active: null, count: 6 },
      ],
    },
    observedTasks: [1, 2, 3, 4, 5].map((taskId) => ({
      taskId,
      eligibleCount: Math.max(0, count - 1),
      observedCount: Math.max(0, count - 2),
    })),
    feedbackRows: [
      { category: 'bug', priority: 'high', status: 'reviewing', issueTheme: 'navigation', count: 5 },
    ],
  };
}

test('validates a single allowlisted filter set and rejects unsafe combinations', () => {
  assert.deepEqual(validateResearchMetricFilters({
    campaign: '7',
    from: '2026-09-01',
    to: '2026-09-09',
    respondent: 'student',
    experience: 'advanced',
    device: 'desktop',
  }), {
    campaignId: 7,
    dateFrom: '2026-09-01',
    dateTo: '2026-09-09',
    respondentType: 'student',
    experienceLevel: 'advanced',
    primaryDevice: 'desktop',
    hasDemographicFilter: true,
  });

  for (const filters of [
    { campaign: ['7', '8'] },
    { from: '2026-09-10', to: '2026-09-09' },
    { respondent: 'private-free-text' },
    { userId: '42' },
  ]) {
    assert.throws(() => validateResearchMetricFilters(filters), ResearchMetricFilterError);
  }
});

test('resolves an inclusive date filter to a campaign-bounded UTC half-open window', () => {
  const filters = validateResearchMetricFilters({ from: '2026-08-01', to: '2026-10-01' });
  assert.deepEqual(resolveResearchMetricWindow(filters, campaign, {
    now: new Date('2026-09-15T00:00:00.000Z'),
  }), {
    start: '2026-09-01T06:00:00.000Z',
    endExclusive: '2026-09-15T00:00:00.000Z',
    dateFrom: '2026-08-01',
    dateTo: '2026-10-01',
    partial: true,
    empty: false,
  });
});

test('builds rates with numerator, denominator, UTC window, and explicit deduplication', () => {
  const metrics = buildResearchMetrics(dataset());
  assert.deepEqual(metrics.overview.responseRate, {
    numerator: 5,
    denominator: 10,
    percentage: 50,
    suppressed: false,
    unavailable: false,
    unavailableReason: null,
    window: {
      start: '2026-09-01T06:00:00.000Z',
      endExclusive: '2026-09-15T00:00:00.000Z',
    },
    deduplication: 'one submitted evaluation per campaign and authenticated member',
  });
  assert.equal(metrics.funnels[0].rate.percentage, 80);
  assert.equal(metrics.funnels[1].rate.percentage, 80);
  assert.equal(metrics.funnels[2].rate.percentage, 100);
  assert.equal(metrics.sus.summary.mean, 70);
  assert.equal(metrics.sus.summary.median, 70);
  assert.equal(metrics.sus.summary.standardDeviation > 0, true);
  assert.deepEqual(metrics.tasks[0].observed.unavailable, { value: 1, suppressed: false });
  assert.deepEqual(metrics.tasks[0].observed.notObserved, { value: 1, suppressed: false });
});

test('suppresses every research value for a cohort below five without retaining the exact count', () => {
  const metrics = buildResearchMetrics(dataset(4));
  assert.equal(metrics.privacy.responseSuppressed, true);
  assert.deepEqual(metrics.overview.responseCount, { value: null, suppressed: true });
  assert.equal(metrics.overview.responseRate.numerator, null);
  assert.equal(metrics.overview.responseRate.denominator, null);
  assert.equal(metrics.sus.summary.count, null);
  assert.equal(metrics.tasks[0].selfReported.success, null);
  assert.equal(metrics.tasks[0].observed.observed.value, null);
  assert.equal(JSON.stringify(metrics).includes('"value":4'), false);
});

test('suppresses a whole breakdown when one row is below five to prevent subtraction attacks', () => {
  const data = dataset(6);
  data.evaluations = [
    ...Array.from({ length: 5 }, (_, index) => evaluation(index, 'student')),
    evaluation(5, 'teacher'),
  ];
  const metrics = buildResearchMetrics(data);
  assert.equal(metrics.demographics.respondentType.every((row) => row.suppressed), true);
  assert.equal(metrics.demographics.respondentType.every((row) => row.count == null), true);
});

test('marks subgroup response rate unavailable because the campaign snapshot is not subgroup-specific', () => {
  const data = dataset();
  data.filters = validateResearchMetricFilters({ campaign: '7', respondent: 'student' });
  const metrics = buildResearchMetrics(data);
  assert.equal(metrics.overview.responseRate.unavailable, true);
  assert.equal(metrics.overview.responseRate.denominator, null);
  assert.match(metrics.overview.responseRate.unavailableReason, /subgroup denominator/);
});
