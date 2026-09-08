import {
  ResearchMetricFilterError,
  resolveResearchMetricWindow,
  validateResearchMetricFilters,
} from './researchMetricsCore.js';

const taskResultValues = new Set(['success', 'partial', 'failed', 'not_attempted']);

function sqlTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new ResearchMetricFilterError('Metric window is invalid');
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseTaskResults(value) {
  const rows = parseJson(value, []);
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const taskId = Number(row?.taskId);
    if (!Number.isInteger(taskId) || taskId < 1 || taskId > 5 || !taskResultValues.has(row?.result)) return [];
    return [{ taskId, result: row.result }];
  });
}

function integer(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function evaluationConditions(filters, window, alias = 'response') {
  const conditions = [
    `${alias}.campaign_id = ?`,
    `${alias}.response_status = 'submitted'`,
    `${alias}.submitted_at >= ?`,
    `${alias}.submitted_at < ?`,
  ];
  const params = [filters.campaignId, sqlTimestamp(window.start), sqlTimestamp(window.endExclusive)];
  for (const [column, value] of [
    ['respondent_type', filters.respondentType],
    ['experience_level', filters.experienceLevel],
    ['primary_device', filters.primaryDevice],
  ]) {
    if (value) {
      conditions.push(`${alias}.${column} = ?`);
      params.push(value);
    }
  }
  return { sql: conditions.join('\n       AND '), params };
}

function analyticsConditions(campaign, window, alias = 'event') {
  return {
    sql: `${alias}.data_scope = ?
       AND ${alias}.occurred_at >= ?
       AND ${alias}.occurred_at < ?
       AND (${alias}.campaign_id IS NULL OR ${alias}.campaign_id = ?)`,
    params: [
      campaign.dataScope,
      sqlTimestamp(window.start),
      sqlTimestamp(window.endExclusive),
      campaign.campaignId,
    ],
  };
}

function normalizeActive(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

async function readMetricRows(connection, campaign, filters, window) {
  const evaluationWhere = evaluationConditions(filters, window);
  const analyticsWhere = analyticsConditions(campaign, window);
  const filteredEvaluationWhere = evaluationConditions(filters, window, 'filtered_response');
  const analyticsDemographicJoin = filters.hasDemographicFilter
    ? `INNER JOIN analytics_consents filtered_consent
         ON filtered_consent.subject_key = event.subject_key
        AND filtered_consent.status = 'active'
       INNER JOIN evaluation_responses filtered_response
         ON filtered_response.user_id = filtered_consent.user_id
        AND ${filteredEvaluationWhere.sql}`
    : '';
  const analyticsDemographicParams = filters.hasDemographicFilter ? filteredEvaluationWhere.params : [];
  const [evaluationRows] = await connection.query(
    `SELECT response.respondent_type, response.experience_level, response.primary_device,
            response.sus_score, response.task_results
     FROM evaluation_responses response
     WHERE ${evaluationWhere.sql}
     ORDER BY response.submitted_at ASC`,
    evaluationWhere.params,
  );

  const demographicConsentJoin = filters.hasDemographicFilter
    ? `INNER JOIN evaluation_responses response
         ON response.user_id = consent.user_id
        AND ${evaluationWhere.sql}`
    : '';
  const demographicConsentParams = filters.hasDemographicFilter ? evaluationWhere.params : [];
  const [consentRows] = await connection.query(
    `SELECT COUNT(DISTINCT consent.subject_key) AS consent_count
     FROM analytics_consents consent
     ${demographicConsentJoin}
     WHERE consent.status = 'active'
       AND consent.consented_at < ?`,
    [...demographicConsentParams, sqlTimestamp(window.endExclusive)],
  );

  const [participantRows] = await connection.query(
    `SELECT COUNT(DISTINCT event.subject_key) AS subject_count,
            COUNT(DISTINCT event.session_key) AS session_count,
            COUNT(*) AS event_count
     FROM analytics_events event
     ${analyticsDemographicJoin}
     WHERE ${analyticsWhere.sql}`,
    [...analyticsDemographicParams, ...analyticsWhere.params],
  );

  const [eventRows] = await connection.query(
    `SELECT event.event_name, event.outcome,
            JSON_UNQUOTE(JSON_EXTRACT(event.properties, '$.feed')) AS property_feed,
            JSON_UNQUOTE(JSON_EXTRACT(event.properties, '$.active')) AS property_active,
            COUNT(*) AS event_count
     FROM analytics_events event
     ${analyticsDemographicJoin}
     WHERE ${analyticsWhere.sql}
     GROUP BY event.event_name, event.outcome, property_feed, property_active`,
    [...analyticsDemographicParams, ...analyticsWhere.params],
  );

  const openedWhere = analyticsConditions(campaign, window, 'opened');
  const searchWhere = analyticsConditions(campaign, window, 'search_event');
  const searchFilteredEvaluationWhere = evaluationConditions(filters, window, 'search_filtered_response');
  const searchDemographicJoin = filters.hasDemographicFilter
    ? `INNER JOIN analytics_consents search_filtered_consent
         ON search_filtered_consent.subject_key = search_event.subject_key
        AND search_filtered_consent.status = 'active'
       INNER JOIN evaluation_responses search_filtered_response
         ON search_filtered_response.user_id = search_filtered_consent.user_id
        AND ${searchFilteredEvaluationWhere.sql}`
    : '';
  const searchDemographicParams = filters.hasDemographicFilter ? searchFilteredEvaluationWhere.params : [];
  const [searchRows] = await connection.query(
    `SELECT COUNT(DISTINCT search_event.id) AS denominator,
            COUNT(DISTINCT CASE WHEN opened.id IS NOT NULL THEN search_event.id END) AS numerator
     FROM analytics_events search_event
     ${searchDemographicJoin}
     LEFT JOIN analytics_events opened
       ON opened.subject_key = search_event.subject_key
      AND opened.session_key = search_event.session_key
      AND opened.event_name = 'search_result_opened'
      AND opened.occurred_at >= search_event.occurred_at
      AND opened.occurred_at <= DATE_ADD(search_event.occurred_at, INTERVAL 5 MINUTE)
      AND ${openedWhere.sql}
     WHERE search_event.event_name = 'search_performed'
       AND ${searchWhere.sql}`,
    [...searchDemographicParams, ...openedWhere.params, ...searchWhere.params],
  );

  const cohortSql = `SELECT DISTINCT consent.subject_key
                     FROM evaluation_responses response
                     INNER JOIN analytics_consents consent
                       ON consent.user_id = response.user_id
                      AND consent.status = 'active'
                     WHERE ${evaluationWhere.sql}`;
  const observedWhere = analyticsConditions(campaign, window, 'observed_event');
  const [observedFlagRows] = await connection.query(
    `SELECT COUNT(*) AS eligible_count,
            COALESCE(SUM(flags.task_2), 0) AS task_2,
            COALESCE(SUM(flags.task_3), 0) AS task_3,
            COALESCE(SUM(flags.task_4), 0) AS task_4,
            COALESCE(SUM(CASE WHEN flags.has_follow = 1 AND flags.has_feed = 1 THEN 1 ELSE 0 END), 0) AS task_5
     FROM (
       SELECT cohort.subject_key,
              MAX(CASE WHEN observed_event.event_name = 'topic_created' AND observed_event.outcome = 'success' THEN 1 ELSE 0 END) AS task_2,
              MAX(CASE WHEN observed_event.event_name = 'comment_created' AND observed_event.outcome = 'success' THEN 1 ELSE 0 END) AS task_3,
              MAX(CASE WHEN observed_event.event_name IN ('like_changed', 'bookmark_changed')
                            AND JSON_UNQUOTE(JSON_EXTRACT(observed_event.properties, '$.active')) = 'true' THEN 1 ELSE 0 END) AS task_4,
              MAX(CASE WHEN observed_event.event_name IN ('category_follow_changed', 'author_follow_changed')
                            AND JSON_UNQUOTE(JSON_EXTRACT(observed_event.properties, '$.active')) = 'true' THEN 1 ELSE 0 END) AS has_follow,
              MAX(CASE WHEN observed_event.event_name = 'feed_viewed'
                            AND JSON_UNQUOTE(JSON_EXTRACT(observed_event.properties, '$.feed')) IN ('following', 'for_you') THEN 1 ELSE 0 END) AS has_feed
       FROM (${cohortSql}) cohort
       LEFT JOIN analytics_events observed_event
         ON observed_event.subject_key = cohort.subject_key
        AND ${observedWhere.sql}
       GROUP BY cohort.subject_key
     ) flags`,
    [...evaluationWhere.params, ...observedWhere.params],
  );

  const observedSearchWhere = analyticsConditions(campaign, window, 'observed_search');
  const observedOpenedWhere = analyticsConditions(campaign, window, 'observed_opened');
  const [observedSearchRows] = await connection.query(
    `SELECT COUNT(DISTINCT observed_search.subject_key) AS observed_count
     FROM (${cohortSql}) cohort
     INNER JOIN analytics_events observed_search
       ON observed_search.subject_key = cohort.subject_key
      AND observed_search.event_name = 'search_performed'
      AND ${observedSearchWhere.sql}
     INNER JOIN analytics_events observed_opened
       ON observed_opened.subject_key = observed_search.subject_key
      AND observed_opened.session_key = observed_search.session_key
      AND observed_opened.event_name = 'search_result_opened'
      AND observed_opened.occurred_at >= observed_search.occurred_at
      AND observed_opened.occurred_at <= DATE_ADD(observed_search.occurred_at, INTERVAL 5 MINUTE)
      AND ${observedOpenedWhere.sql}`,
    [...evaluationWhere.params, ...observedSearchWhere.params, ...observedOpenedWhere.params],
  );

  const feedbackDemographicJoin = filters.hasDemographicFilter
    ? `INNER JOIN evaluation_responses response
         ON response.user_id = feedback.user_id
        AND ${evaluationWhere.sql}`
    : '';
  const feedbackDemographicParams = filters.hasDemographicFilter ? evaluationWhere.params : [];
  const [feedbackRows] = await connection.query(
    `SELECT feedback.category, feedback.priority, feedback.status, feedback.issue_theme,
            COUNT(*) AS feedback_count
     FROM feedback_submissions feedback
     ${feedbackDemographicJoin}
     WHERE feedback.campaign_id = ?
       AND feedback.data_scope = ?
       AND feedback.created_at >= ?
       AND feedback.created_at < ?
     GROUP BY feedback.category, feedback.priority, feedback.status, feedback.issue_theme`,
    [
      ...feedbackDemographicParams,
      campaign.campaignId,
      campaign.dataScope,
      sqlTimestamp(window.start),
      sqlTimestamp(window.endExclusive),
    ],
  );

  const observedFlags = observedFlagRows[0] ?? {};
  const eligibleCount = integer(observedFlags.eligible_count);
  return {
    campaign: { ...campaign },
    filters,
    window,
    consentCount: integer(consentRows[0]?.consent_count),
    evaluations: evaluationRows.map((row) => ({
      respondentType: row.respondent_type,
      experienceLevel: row.experience_level,
      primaryDevice: row.primary_device,
      susScore: row.sus_score == null ? null : Number(row.sus_score),
      taskResults: parseTaskResults(row.task_results),
    })),
    analytics: {
      subjectCount: integer(participantRows[0]?.subject_count),
      sessionCount: integer(participantRows[0]?.session_count),
      totalEvents: integer(participantRows[0]?.event_count),
      searchNumerator: integer(searchRows[0]?.numerator),
      searchDenominator: integer(searchRows[0]?.denominator),
      eventCounts: eventRows.map((row) => ({
        eventName: row.event_name,
        outcome: row.outcome ?? null,
        feed: row.property_feed ?? null,
        active: normalizeActive(row.property_active),
        count: integer(row.event_count),
      })),
    },
    observedTasks: [
      { taskId: 1, eligibleCount, observedCount: integer(observedSearchRows[0]?.observed_count) },
      { taskId: 2, eligibleCount, observedCount: integer(observedFlags.task_2) },
      { taskId: 3, eligibleCount, observedCount: integer(observedFlags.task_3) },
      { taskId: 4, eligibleCount, observedCount: integer(observedFlags.task_4) },
      { taskId: 5, eligibleCount, observedCount: integer(observedFlags.task_5) },
    ],
    feedbackRows: feedbackRows.map((row) => ({
      category: row.category,
      priority: row.priority,
      status: row.status,
      issueTheme: row.issue_theme ?? 'unclassified',
      count: integer(row.feedback_count),
    })),
  };
}

export async function loadResearchMetricDataset(database, campaign, rawFilters = {}, options = {}) {
  if (!campaign || campaign.dataScope !== 'pilot') {
    throw new ResearchMetricFilterError('Only a selected pilot campaign can be measured', 'campaign_unavailable');
  }
  const filters = validateResearchMetricFilters(rawFilters);
  if (filters.campaignId != null && filters.campaignId !== campaign.campaignId) {
    throw new ResearchMetricFilterError('Selected campaign does not match the requested campaign', 'campaign_not_found');
  }
  const effectiveFilters = { ...filters, campaignId: campaign.campaignId };
  const window = resolveResearchMetricWindow(effectiveFilters, campaign, options);
  const connection = await database.getConnection();
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.beginTransaction();
    const dataset = await readMetricRows(connection, campaign, effectiveFilters, window);
    await connection.commit();
    return dataset;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
