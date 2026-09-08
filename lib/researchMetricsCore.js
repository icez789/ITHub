import { summarizeNumericValues } from './researchShared.js';

export const RESEARCH_MIN_GROUP_SIZE = 5;
export const SEARCH_TO_OPEN_WINDOW_MINUTES = 5;

const respondentTypes = new Set(['student', 'teacher', 'other']);
const experienceLevels = new Set(['beginner', 'intermediate', 'advanced']);
const primaryDevices = new Set(['mobile', 'tablet', 'desktop']);
const filterKeys = new Set(['campaign', 'from', 'to', 'respondent', 'experience', 'device']);

export class ResearchMetricFilterError extends Error {
  constructor(message, code = 'invalid_filter') {
    super(message);
    this.name = 'ResearchMetricFilterError';
    this.code = code;
  }
}

function entriesOf(rawFilters) {
  if (rawFilters instanceof URLSearchParams) return [...rawFilters.entries()];
  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) {
    throw new ResearchMetricFilterError('Filters must be an object');
  }
  return Object.entries(rawFilters).flatMap(([key, rawValue]) => (
    Array.isArray(rawValue) ? rawValue.map((value) => [key, value]) : [[key, rawValue]]
  ));
}

function normalizedFilterEntries(rawFilters) {
  const values = new Map();
  for (const [key, rawValue] of entriesOf(rawFilters)) {
    if (!filterKeys.has(key)) throw new ResearchMetricFilterError(`Unsupported filter: ${key}`);
    if (values.has(key)) throw new ResearchMetricFilterError(`Filter must appear once: ${key}`);
    if (rawValue == null || rawValue === '') continue;
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
      throw new ResearchMetricFilterError(`Invalid filter: ${key}`);
    }
    values.set(key, String(rawValue).trim());
  }
  return values;
}

function dateOnly(value, label) {
  if (value == null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ResearchMetricFilterError(`Invalid ${label}`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ResearchMetricFilterError(`Invalid ${label}`);
  }
  return value;
}

function enumValue(value, allowed, label) {
  if (value == null) return null;
  if (!allowed.has(value)) throw new ResearchMetricFilterError(`Invalid ${label}`);
  return value;
}

export function validateResearchMetricFilters(rawFilters = {}) {
  const values = normalizedFilterEntries(rawFilters);
  const campaignText = values.get('campaign') ?? null;
  const campaignId = campaignText == null ? null : Number(campaignText);
  if (campaignText != null && (!Number.isInteger(campaignId) || campaignId <= 0)) {
    throw new ResearchMetricFilterError('Invalid campaign');
  }

  const dateFrom = dateOnly(values.get('from') ?? null, 'start date');
  const dateTo = dateOnly(values.get('to') ?? null, 'end date');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new ResearchMetricFilterError('Start date must not be after end date');
  }

  const respondentType = enumValue(values.get('respondent') ?? null, respondentTypes, 'respondent type');
  const experienceLevel = enumValue(values.get('experience') ?? null, experienceLevels, 'experience level');
  const primaryDevice = enumValue(values.get('device') ?? null, primaryDevices, 'primary device');

  return {
    campaignId,
    dateFrom,
    dateTo,
    respondentType,
    experienceLevel,
    primaryDevice,
    hasDemographicFilter: Boolean(respondentType || experienceLevel || primaryDevice),
  };
}

function validDate(value, label) {
  const date = value instanceof Date ? new Date(value) : new Date(value ?? Number.NaN);
  if (!Number.isFinite(date.getTime())) throw new ResearchMetricFilterError(`Campaign ${label} is unavailable`);
  return date;
}

function nextUtcDay(dateText) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export function resolveResearchMetricWindow(filters, campaign, { now = new Date() } = {}) {
  const campaignStart = validDate(campaign?.startsAt, 'start');
  const campaignEnd = validDate(campaign?.endsAt, 'end');
  const currentTime = validDate(now, 'current time');
  if (campaignEnd <= campaignStart) throw new ResearchMetricFilterError('Campaign window is invalid');

  const requestedStart = filters.dateFrom
    ? new Date(`${filters.dateFrom}T00:00:00.000Z`)
    : campaignStart;
  const requestedEnd = filters.dateTo ? nextUtcDay(filters.dateTo) : campaignEnd;
  const start = new Date(Math.max(campaignStart.getTime(), requestedStart.getTime()));
  const endExclusive = new Date(Math.min(campaignEnd.getTime(), requestedEnd.getTime(), currentTime.getTime()));
  const safeEnd = endExclusive < start ? start : endExclusive;

  return {
    start: start.toISOString(),
    endExclusive: safeEnd.toISOString(),
    dateFrom: filters.dateFrom ?? start.toISOString().slice(0, 10),
    dateTo: filters.dateTo ?? new Date(Math.max(start.getTime(), safeEnd.getTime() - 1)).toISOString().slice(0, 10),
    partial: currentTime < campaignEnd,
    empty: safeEnd <= start,
  };
}

function integer(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function shouldSuppress(count) {
  return count > 0 && count < RESEARCH_MIN_GROUP_SIZE;
}

function protectedValue(value, suppressed) {
  return { value: suppressed ? null : value, suppressed };
}

function rateMetric(numerator, denominator, { suppressed = false, window, deduplication, unavailableReason = null } = {}) {
  const safeNumerator = integer(numerator);
  const safeDenominator = denominator == null ? null : integer(denominator);
  const unavailable = unavailableReason != null || safeDenominator == null;
  return {
    numerator: suppressed ? null : safeNumerator,
    denominator: suppressed || unavailable ? null : safeDenominator,
    percentage: suppressed || unavailable || safeDenominator === 0
      ? null
      : Math.round((safeNumerator / safeDenominator) * 10_000) / 100,
    suppressed,
    unavailable,
    unavailableReason,
    window: { start: window.start, endExclusive: window.endExclusive },
    deduplication,
  };
}

function eventCount(rows, eventName, { outcome = undefined, feed = undefined, active = undefined } = {}) {
  return rows.reduce((total, row) => {
    if (row.eventName !== eventName) return total;
    if (outcome !== undefined && row.outcome !== outcome) return total;
    if (feed !== undefined && row.feed !== feed) return total;
    if (active !== undefined && row.active !== active) return total;
    return total + integer(row.count);
  }, 0);
}

function protectedBreakdown(rows) {
  const suppressDimension = rows.some((row) => shouldSuppress(row.count));
  return rows.map((row) => ({
    ...row,
    count: suppressDimension ? null : row.count,
    suppressed: suppressDimension,
  }));
}

function dimensionBreakdown(evaluations, key, values) {
  return protectedBreakdown(values.map((value) => ({
    value,
    count: evaluations.filter((row) => row[key] === value).length,
  })));
}

function susDistribution(scores) {
  const ranges = [
    { value: '0-49.99', min: 0, max: 50 },
    { value: '50-69.99', min: 50, max: 70 },
    { value: '70-84.99', min: 70, max: 85 },
    { value: '85-100', min: 85, max: 100.000_001 },
  ];
  return protectedBreakdown(ranges.map((range) => ({
    value: range.value,
    count: scores.filter((score) => score >= range.min && score < range.max).length,
  })));
}

function selfReportedTasks(evaluations) {
  return [1, 2, 3, 4, 5].map((taskId) => {
    const counts = { success: 0, partial: 0, failed: 0, notAttempted: 0 };
    for (const evaluation of evaluations) {
      const task = evaluation.taskResults.find((item) => item.taskId === taskId);
      if (!task) continue;
      if (task.result === 'not_attempted') counts.notAttempted += 1;
      else if (Object.hasOwn(counts, task.result)) counts[task.result] += 1;
    }
    return { taskId, ...counts };
  });
}

function observedTasks(rows, responseCount, suppressed, window) {
  const byTask = new Map(rows.map((row) => [Number(row.taskId), row]));
  return [1, 2, 3, 4, 5].map((taskId) => {
    const row = byTask.get(taskId) ?? {};
    const eligible = integer(row.eligibleCount);
    const observed = Math.min(eligible, integer(row.observedCount));
    return {
      taskId,
      observed: protectedValue(observed, suppressed),
      notObserved: protectedValue(Math.max(0, eligible - observed), suppressed),
      unavailable: protectedValue(Math.max(0, responseCount - eligible), suppressed),
      rate: rateMetric(observed, eligible, {
        suppressed,
        window,
        deduplication: 'distinct consenting respondent per task within the selected UTC window',
      }),
    };
  });
}

function feedbackBreakdown(rows, key, values) {
  return protectedBreakdown(values.map((value) => ({
    value,
    count: rows
      .filter((row) => row[key] === value)
      .reduce((sum, row) => sum + integer(row.count), 0),
  })));
}

export function buildResearchMetrics(dataset) {
  const evaluations = Array.isArray(dataset.evaluations) ? dataset.evaluations : [];
  const eventRows = Array.isArray(dataset.analytics?.eventCounts) ? dataset.analytics.eventCounts : [];
  const feedbackRows = Array.isArray(dataset.feedbackRows) ? dataset.feedbackRows : [];
  const responseCount = evaluations.length;
  const analyticsSubjectCount = integer(dataset.analytics?.subjectCount);
  const feedbackCount = feedbackRows.reduce((sum, row) => sum + integer(row.count), 0);
  const responseSuppressed = shouldSuppress(responseCount);
  const analyticsSuppressed = shouldSuppress(analyticsSubjectCount)
    || (dataset.filters.hasDemographicFilter && responseSuppressed);
  const feedbackSuppressed = shouldSuppress(feedbackCount);
  const eligibleMemberCount = dataset.campaign.eligibleMemberCount == null
    ? null
    : integer(dataset.campaign.eligibleMemberCount);

  const topicAttempts = eventCount(eventRows, 'topic_created', { outcome: 'attempt' });
  const topicSuccesses = eventCount(eventRows, 'topic_created', { outcome: 'success' });
  const commentAttempts = eventCount(eventRows, 'comment_created', { outcome: 'attempt' });
  const commentSuccesses = eventCount(eventRows, 'comment_created', { outcome: 'success' });
  const searchNumerator = integer(dataset.analytics?.searchNumerator);
  const searchDenominator = integer(dataset.analytics?.searchDenominator);
  const scores = evaluations.map((row) => row.susScore).filter(Number.isFinite);
  const susSuppressed = shouldSuppress(scores.length);
  const susSummary = summarizeNumericValues(scores);
  const selfReported = selfReportedTasks(evaluations);
  const observed = observedTasks(dataset.observedTasks ?? [], responseCount, responseSuppressed, dataset.window);

  return {
    campaign: { ...dataset.campaign },
    filters: { ...dataset.filters },
    window: { ...dataset.window },
    privacy: {
      minimumGroupSize: RESEARCH_MIN_GROUP_SIZE,
      responseSuppressed,
      analyticsSuppressed,
      feedbackSuppressed,
    },
    overview: {
      consentCount: protectedValue(integer(dataset.consentCount), shouldSuppress(integer(dataset.consentCount))),
      responseCount: protectedValue(responseCount, responseSuppressed),
      responseRate: rateMetric(responseCount, eligibleMemberCount, {
        suppressed: responseSuppressed,
        window: dataset.window,
        deduplication: 'one submitted evaluation per campaign and authenticated member',
        unavailableReason: dataset.filters.hasDemographicFilter
          ? 'The campaign snapshot has no subgroup denominator'
          : eligibleMemberCount == null
            ? 'The campaign eligible-member snapshot is unavailable'
            : null,
      }),
      analyticsSubjectCount: protectedValue(analyticsSubjectCount, analyticsSuppressed),
      sessionCount: protectedValue(integer(dataset.analytics?.sessionCount), analyticsSuppressed),
      eventCount: protectedValue(integer(dataset.analytics?.totalEvents), analyticsSuppressed),
      feedbackCount: protectedValue(feedbackCount, feedbackSuppressed),
    },
    funnels: [
      {
        key: 'search_to_open_5m',
        label: 'Search-to-open ภายใน 5 นาที',
        rate: rateMetric(searchNumerator, searchDenominator, {
          suppressed: analyticsSuppressed,
          window: dataset.window,
          deduplication: 'each search event matched once to a later open in the same subject and session within 5 minutes',
        }),
      },
      {
        key: 'topic_create_success',
        label: 'สร้างกระทู้สำเร็จ',
        rate: rateMetric(topicSuccesses, topicAttempts, {
          suppressed: analyticsSuppressed,
          window: dataset.window,
          deduplication: 'unique event IDs; success events divided by attempt events',
        }),
      },
      {
        key: 'comment_create_success',
        label: 'สร้างความคิดเห็นสำเร็จ',
        rate: rateMetric(commentSuccesses, commentAttempts, {
          suppressed: analyticsSuppressed,
          window: dataset.window,
          deduplication: 'unique event IDs; success events divided by attempt events',
        }),
      },
    ],
    engagement: [
      ['like_activated', 'เปิด Like', eventCount(eventRows, 'like_changed', { active: true })],
      ['bookmark_activated', 'เปิด Bookmark', eventCount(eventRows, 'bookmark_changed', { active: true })],
      ['category_follow_activated', 'ติดตามหมวด', eventCount(eventRows, 'category_follow_changed', { active: true })],
      ['author_follow_activated', 'ติดตามผู้เขียน', eventCount(eventRows, 'author_follow_changed', { active: true })],
    ].map(([key, label, count]) => ({ key, label, count: protectedValue(count, analyticsSuppressed) })),
    feeds: ['community', 'following', 'for_you'].map((feed) => ({
      feed,
      count: protectedValue(eventCount(eventRows, 'feed_viewed', { feed }), analyticsSuppressed),
    })),
    sus: {
      summary: {
        count: susSuppressed ? null : susSummary.count,
        mean: susSuppressed ? null : susSummary.mean,
        median: susSuppressed ? null : susSummary.median,
        standardDeviation: susSuppressed ? null : susSummary.standardDeviation,
        min: susSuppressed ? null : susSummary.min,
        max: susSuppressed ? null : susSummary.max,
        suppressed: susSuppressed,
      },
      distribution: susDistribution(scores),
    },
    demographics: {
      respondentType: dimensionBreakdown(evaluations, 'respondentType', [...respondentTypes]),
      experienceLevel: dimensionBreakdown(evaluations, 'experienceLevel', [...experienceLevels]),
      primaryDevice: dimensionBreakdown(evaluations, 'primaryDevice', [...primaryDevices]),
    },
    tasks: selfReported.map((selfReport, index) => ({
      taskId: selfReport.taskId,
      selfReported: responseSuppressed
        ? { success: null, partial: null, failed: null, notAttempted: null, suppressed: true }
        : {
          success: selfReport.success,
          partial: selfReport.partial,
          failed: selfReport.failed,
          notAttempted: selfReport.notAttempted,
          suppressed: false,
        },
      observed: observed[index],
    })),
    feedback: {
      byCategory: feedbackBreakdown(feedbackRows, 'category', ['bug', 'ux_ui', 'feature', 'content', 'other']),
      byPriority: feedbackBreakdown(feedbackRows, 'priority', ['low', 'normal', 'high', 'urgent']),
      byStatus: feedbackBreakdown(feedbackRows, 'status', ['new', 'reviewing', 'planned', 'resolved', 'declined']),
      byTheme: protectedBreakdown(
        [...new Set(feedbackRows.map((row) => row.issueTheme ?? 'unclassified'))]
          .sort()
          .map((value) => ({
            value,
            count: feedbackRows
              .filter((row) => (row.issueTheme ?? 'unclassified') === value)
              .reduce((sum, row) => sum + integer(row.count), 0),
          })),
      ),
    },
  };
}
