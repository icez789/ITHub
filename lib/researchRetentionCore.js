export const RAW_ANALYTICS_RETENTION_DAYS = 180;

const millisecondsPerDay = 24 * 60 * 60 * 1000;
const zeroCounts = Object.freeze({
  analyticsEvents: 0,
  evaluationResponses: 0,
  feedbackSubmissions: 0,
});

function requiredDate(value, label) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${label} must be a valid date`);
  return date;
}

export function calculateRawAnalyticsCutoff(asOf, retentionDays = RAW_ANALYTICS_RETENTION_DAYS) {
  if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
    throw new Error('Raw analytics retention days must be a positive integer');
  }
  return new Date(requiredDate(asOf, 'Retention as-of').getTime() - (retentionDays * millisecondsPerDay));
}

export function isRawAnalyticsExpired(receivedAt, asOf) {
  return requiredDate(receivedAt, 'Analytics received-at').getTime()
    < calculateRawAnalyticsCutoff(asOf).getTime();
}

export function isResearchRecordExpired(retentionUntil, asOf) {
  if (retentionUntil == null) return false;
  return requiredDate(retentionUntil, 'Research retention deadline').getTime()
    <= requiredDate(asOf, 'Retention as-of').getTime();
}

function countFromRows(rows) {
  const count = Number(rows?.[0]?.count);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('Retention query returned an invalid aggregate count');
  }
  return count;
}

function affectedRows(result) {
  const count = Number(result?.affectedRows);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('Retention deletion returned an invalid affected-row count');
  }
  return count;
}

async function loadRetentionClock(connection) {
  await connection.query('SET @ithub_retention_as_of = UTC_TIMESTAMP(3)');
  const [rows] = await connection.query(`
    SELECT
      DATE_FORMAT(@ithub_retention_as_of, '%Y-%m-%dT%H:%i:%sZ') AS as_of_utc,
      DATE_FORMAT(
        DATE_SUB(@ithub_retention_as_of, INTERVAL ${RAW_ANALYTICS_RETENTION_DAYS} DAY),
        '%Y-%m-%dT%H:%i:%sZ'
      ) AS raw_analytics_cutoff_utc
  `);
  const clock = rows?.[0];
  if (!clock?.as_of_utc || !clock?.raw_analytics_cutoff_utc) {
    throw new Error('Retention database clock was unavailable');
  }
  return {
    asOfUtc: String(clock.as_of_utc),
    rawAnalyticsCutoffUtc: String(clock.raw_analytics_cutoff_utc),
  };
}

async function countEligibleRows(connection) {
  const [analyticsRows] = await connection.query(`
    SELECT COUNT(*) AS count
    FROM analytics_events
    WHERE received_at < DATE_SUB(
      @ithub_retention_as_of,
      INTERVAL ${RAW_ANALYTICS_RETENTION_DAYS} DAY
    )
  `);
  const [evaluationRows] = await connection.query(`
    SELECT COUNT(*) AS count
    FROM evaluation_responses r
    INNER JOIN evaluation_campaigns c ON c.id = r.campaign_id
    WHERE c.retention_until IS NOT NULL
      AND c.retention_until <= @ithub_retention_as_of
  `);
  const [feedbackRows] = await connection.query(`
    SELECT COUNT(*) AS count
    FROM feedback_submissions
    WHERE retention_until IS NOT NULL
      AND retention_until <= @ithub_retention_as_of
  `);
  return {
    analyticsEvents: countFromRows(analyticsRows),
    evaluationResponses: countFromRows(evaluationRows),
    feedbackSubmissions: countFromRows(feedbackRows),
  };
}

async function deleteEligibleRows(connection) {
  const [analyticsResult] = await connection.query(`
    DELETE FROM analytics_events
    WHERE received_at < DATE_SUB(
      @ithub_retention_as_of,
      INTERVAL ${RAW_ANALYTICS_RETENTION_DAYS} DAY
    )
  `);
  const [evaluationResult] = await connection.query(`
    DELETE r FROM evaluation_responses r
    INNER JOIN evaluation_campaigns c ON c.id = r.campaign_id
    WHERE c.retention_until IS NOT NULL
      AND c.retention_until <= @ithub_retention_as_of
  `);
  const [feedbackResult] = await connection.query(`
    DELETE FROM feedback_submissions
    WHERE retention_until IS NOT NULL
      AND retention_until <= @ithub_retention_as_of
  `);
  return {
    analyticsEvents: affectedRows(analyticsResult),
    evaluationResponses: affectedRows(evaluationResult),
    feedbackSubmissions: affectedRows(feedbackResult),
  };
}

export async function runResearchRetentionCleanup(database, { execute = false } = {}) {
  if (typeof execute !== 'boolean') throw new Error('Retention execute mode must be boolean');
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const clock = await loadRetentionClock(connection);
    const eligible = await countEligibleRows(connection);
    const deleted = execute ? await deleteEligibleRows(connection) : { ...zeroCounts };
    await connection.commit();
    return {
      version: 1,
      operation: 'research_retention_cleanup',
      mode: execute ? 'execute' : 'dry_run',
      ...clock,
      eligible,
      deleted,
    };
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
