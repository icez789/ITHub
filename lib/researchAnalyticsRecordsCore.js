const subjectKeyPattern = /^[a-f0-9]{64}$/;

export class AnalyticsConsentRequiredError extends Error {
  constructor() {
    super('Active analytics consent is required');
    this.name = 'AnalyticsConsentRequiredError';
  }
}

export class AnalyticsCampaignUnavailableError extends Error {
  constructor() {
    super('Analytics campaign is unavailable');
    this.name = 'AnalyticsCampaignUnavailableError';
  }
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`Invalid ${label}`);
  return number;
}

function isDuplicateEntry(error) {
  return error?.code === 'ER_DUP_ENTRY' || Number(error?.errno) === 1062;
}

function utcSqlDateWithMilliseconds(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid analytics event time');
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function databaseDate(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new AnalyticsCampaignUnavailableError();
  return date;
}

function campaignIsAvailable(row) {
  const databaseNow = databaseDate(row.database_now);
  const startsAt = databaseDate(row.starts_at);
  const endsAt = databaseDate(row.ends_at);
  return row.status === 'open'
    && row.data_scope === 'pilot'
    && databaseNow !== null
    && (startsAt === null || startsAt <= databaseNow)
    && (endsAt === null || endsAt >= databaseNow);
}

async function inTransaction(database, operation) {
  const connection = await database.getConnection();
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

export async function insertAnalyticsEventRecords(database, userId, events, { createSessionKey }) {
  const safeUserId = positiveInteger(userId, 'analytics user id');
  if (!Array.isArray(events) || events.length === 0) throw new Error('Analytics events are required');
  if (typeof createSessionKey !== 'function') throw new Error('Analytics session key factory is required');

  return inTransaction(database, async (connection) => {
    const [consentRows] = await connection.query(
      `SELECT subject_key, key_version, status
       FROM analytics_consents WHERE user_id = ? LIMIT 1 FOR UPDATE`,
      [safeUserId],
    );
    const consent = consentRows[0];
    if (!consent || consent.status !== 'active' || !subjectKeyPattern.test(consent.subject_key || '')) {
      throw new AnalyticsConsentRequiredError();
    }

    const campaignIds = [...new Set(events
      .map((event) => event.campaignId)
      .filter((campaignId) => campaignId != null)
      .map((campaignId) => positiveInteger(campaignId, 'analytics campaign id')))];
    if (campaignIds.length > 0) {
      const placeholders = campaignIds.map(() => '?').join(', ');
      const [campaignRows] = await connection.query(
        `SELECT id, status, data_scope, starts_at, ends_at, UTC_TIMESTAMP(3) AS database_now
         FROM evaluation_campaigns WHERE id IN (${placeholders}) FOR UPDATE`,
        campaignIds,
      );
      const availableIds = new Set(
        campaignRows.filter(campaignIsAvailable).map((row) => Number(row.id)),
      );
      if (campaignIds.some((campaignId) => !availableIds.has(campaignId))) {
        throw new AnalyticsCampaignUnavailableError();
      }
    }

    let accepted = 0;
    let duplicates = 0;
    for (const event of events) {
      const sessionKey = createSessionKey(
        consent.subject_key,
        event.sessionId,
        Number(consent.key_version),
      );
      if (!subjectKeyPattern.test(sessionKey || '')) throw new Error('Invalid analytics session key');

      try {
        await connection.query(
          `INSERT INTO analytics_events
             (event_id, subject_key, session_key, campaign_id, data_scope, event_name,
              event_version, outcome, failure_code, route_path, properties, occurred_at)
           VALUES (?, ?, ?, ?, 'pilot', ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.eventId,
            consent.subject_key,
            sessionKey,
            event.campaignId,
            event.eventName,
            event.eventVersion,
            event.outcome,
            event.failureCode,
            event.route,
            JSON.stringify(event.properties),
            utcSqlDateWithMilliseconds(event.occurredAt),
          ],
        );
        accepted += 1;
      } catch (error) {
        if (!isDuplicateEntry(error)) throw error;
        duplicates += 1;
      }
    }

    return { status: 'accepted', accepted, duplicates };
  });
}
