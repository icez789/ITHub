import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import db from '../lib/db.js';
import { buildResearchMetrics } from '../lib/researchMetricsCore.js';
import { loadResearchMetricDataset } from '../lib/researchMetricsRecordsCore.js';
import { assertE2eFlag } from './e2e-safety.mjs';

const guard = assertE2eFlag();
if (!guard) throw new Error('Pass --e2e to run the guarded metrics performance fixture');

const EVENT_COUNT = 100_000;
const BATCH_SIZE = 500;
const QUERY_BUDGET_MS = 2_000;
const fixtureToken = randomUUID().slice(0, 12);
const fixtureEmail = `metrics.performance.${fixtureToken}@example.invalid`;
const fixtureSlug = `metrics-performance-${fixtureToken}`;

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sqlUtc(value) {
  return new Date(value).toISOString().slice(0, 23).replace('T', ' ');
}

async function measure(operation) {
  const startedAt = performance.now();
  const result = await operation();
  return { result, durationMs: Math.round((performance.now() - startedAt) * 100) / 100 };
}

function eventDefinition(index) {
  const position = index % 10;
  return [
    ['search_performed', null, '/', {}],
    ['search_result_opened', null, '/topic/[id]', { resultPosition: 1 }],
    ['topic_created', 'attempt', '/create', {}],
    ['topic_created', 'success', '/create', {}],
    ['comment_created', 'attempt', '/topic/[id]', { reply: false }],
    ['comment_created', 'success', '/topic/[id]', { reply: false }],
    ['like_changed', null, '/topic/[id]', { active: true }],
    ['bookmark_changed', null, '/topic/[id]', { active: true }],
    ['category_follow_changed', null, '/', { active: true, category: 'Software' }],
    ['feed_viewed', null, '/', { feed: 'for_you' }],
  ][position];
}

async function insertEvents({ campaignId, subjectKey }) {
  const baseTime = Date.now() - (60 * 60 * 1000);
  for (let batchStart = 0; batchStart < EVENT_COUNT; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(EVENT_COUNT, batchStart + BATCH_SIZE);
    const values = [];
    for (let index = batchStart; index < batchEnd; index += 1) {
      const [eventName, outcome, route, properties] = eventDefinition(index);
      const sessionIndex = Math.floor(index / 10);
      const occurredAt = baseTime + (sessionIndex * 100) + ((index % 10) * 10);
      values.push(
        randomUUID(),
        subjectKey,
        digest(`metrics-session:${fixtureToken}:${sessionIndex}`),
        campaignId,
        eventName,
        outcome,
        route,
        JSON.stringify(properties),
        sqlUtc(occurredAt),
      );
    }
    await db.query(
      `INSERT INTO analytics_events
         (event_id, subject_key, session_key, campaign_id, data_scope, event_name,
          event_version, outcome, failure_code, route_path, properties, occurred_at)
       VALUES ${Array.from({ length: batchEnd - batchStart }, () => "(?, ?, ?, ?, 'pilot', ?, 1, ?, NULL, ?, ?, ?)").join(', ')}`,
      values,
    );
  }
}

async function cleanup() {
  const [campaignRows] = await db.query('SELECT id FROM evaluation_campaigns WHERE slug = ?', [fixtureSlug]);
  for (const campaign of campaignRows) {
    while (true) {
      const [result] = await db.query('DELETE FROM analytics_events WHERE campaign_id = ? LIMIT 5000', [campaign.id]);
      if (Number(result.affectedRows) === 0) break;
    }
  }
  await db.query('DELETE FROM evaluation_campaigns WHERE slug = ?', [fixtureSlug]);
  await db.query('DELETE FROM users WHERE email = ?', [fixtureEmail]);
}

let userId;
let campaignId;
try {
  await cleanup();
  const [userResult] = await db.query(
    "INSERT INTO users (username, email, password, role) VALUES (?, ?, 'not-a-login-account', 'user')",
    [`metrics_${fixtureToken}`, fixtureEmail],
  );
  userId = Number(userResult.insertId);
  const [campaignResult] = await db.query(
    `INSERT INTO evaluation_campaigns
       (slug, name, status, data_scope, questionnaire_version, consent_notice_version,
        eligible_member_count, starts_at, ends_at, retention_until, opened_at)
     VALUES (?, 'Metrics performance fixture', 'open', 'pilot', 'sus-th-pilot-v1',
       'research-notice-pilot-v1', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY),
       DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY),
       UTC_TIMESTAMP())`,
    [fixtureSlug],
  );
  campaignId = Number(campaignResult.insertId);
  const subjectKey = digest(`metrics-subject:${fixtureToken}:${userId}`);
  await db.query(
    `INSERT INTO analytics_consents
       (user_id, subject_key, key_version, notice_version, status, consented_at)
     VALUES (?, ?, 1, 'research-analytics-pilot-v1', 'active', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY))`,
    [userId, subjectKey],
  );
  await db.query(
    `INSERT INTO evaluation_responses
       (campaign_id, user_id, client_submission_id, response_status, respondent_type,
        experience_level, primary_device, sus_answers, sus_score, task_results)
     VALUES (?, ?, ?, 'submitted', 'student', 'intermediate', 'desktop', ?, 50, ?)`,
    [
      campaignId,
      userId,
      randomUUID(),
      JSON.stringify(Array(10).fill(3)),
      JSON.stringify([1, 2, 3, 4, 5].map((taskId) => ({ taskId, result: 'success', difficulty: 2 }))),
    ],
  );
  await insertEvents({ campaignId, subjectKey });

  const campaign = {
    campaignId,
    slug: fixtureSlug,
    name: 'Metrics performance fixture',
    status: 'open',
    dataScope: 'pilot',
    eligibleMemberCount: 1,
    startsAt: new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)),
    endsAt: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)),
  };
  const measured = await measure(() => loadResearchMetricDataset(
    db,
    campaign,
    { campaign: String(campaignId) },
    { now: new Date() },
  ));
  const metrics = buildResearchMetrics(measured.result);
  if (measured.result.analytics.totalEvents !== EVENT_COUNT) {
    throw new Error(`Expected ${EVENT_COUNT} events in the metric dataset`);
  }
  if (measured.result.analytics.searchDenominator !== 10_000 || measured.result.analytics.searchNumerator !== 10_000) {
    throw new Error('Search-to-open performance fixture produced an invalid funnel');
  }

  const start = sqlUtc(campaign.startsAt);
  const end = sqlUtc(new Date());
  const aggregateSql = `SELECT event_name, outcome, COUNT(*) AS event_count
                        FROM analytics_events
                        WHERE campaign_id = ? AND data_scope = 'pilot'
                          AND occurred_at >= ? AND occurred_at < ?
                        GROUP BY event_name, outcome`;
  const searchSql = `SELECT COUNT(DISTINCT search_event.id) AS denominator,
                            COUNT(DISTINCT CASE WHEN opened.id IS NOT NULL THEN search_event.id END) AS numerator
                     FROM analytics_events search_event
                     LEFT JOIN analytics_events opened
                       ON opened.subject_key = search_event.subject_key
                      AND opened.session_key = search_event.session_key
                      AND opened.event_name = 'search_result_opened'
                      AND opened.occurred_at >= search_event.occurred_at
                      AND opened.occurred_at <= DATE_ADD(search_event.occurred_at, INTERVAL 5 MINUTE)
                     WHERE search_event.campaign_id = ? AND search_event.data_scope = 'pilot'
                       AND search_event.event_name = 'search_performed'
                       AND search_event.occurred_at >= ? AND search_event.occurred_at < ?`;
  const aggregate = await measure(() => db.query(aggregateSql, [campaignId, start, end]));
  const search = await measure(() => db.query(searchSql, [campaignId, start, end]));
  const [[aggregatePlan], [searchPlan]] = await Promise.all([
    db.query(`EXPLAIN ${aggregateSql}`, [campaignId, start, end]),
    db.query(`EXPLAIN ${searchSql}`, [campaignId, start, end]),
  ]);
  if (aggregate.durationMs > QUERY_BUDGET_MS || search.durationMs > QUERY_BUDGET_MS) {
    throw new Error(`A primary metric query exceeded ${QUERY_BUDGET_MS}ms`);
  }

  const planText = JSON.stringify([...aggregatePlan, ...searchPlan]);
  console.log(JSON.stringify({
    status: 'passed',
    database: guard.databaseName,
    eventCount: EVENT_COUNT,
    searchAttempts: measured.result.analytics.searchDenominator,
    searchSuccesses: measured.result.analytics.searchNumerator,
    searchRate: metrics.funnels.find((row) => row.key === 'search_to_open_5m')?.rate.percentage,
    timingMs: {
      completeMetricRead: measured.durationMs,
      eventAggregate: aggregate.durationMs,
      searchToOpen: search.durationMs,
    },
    explain: {
      rows: aggregatePlan.length + searchPlan.length,
      campaignIndexObserved: planText.includes('idx_analytics_events_campaign_name_time'),
      subjectSessionIndexObserved: planText.includes('idx_analytics_events_subject_session_time'),
    },
  }));
} finally {
  await cleanup();
}
