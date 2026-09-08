const subjectKeyPattern = /^[a-f0-9]{64}$/;
const noticeVersionPattern = /^[a-zA-Z0-9._-]{1,64}$/;

function validateUserId(userId) {
  if (!Number.isInteger(userId) || userId <= 0) throw new Error('Consent user id must be a positive integer');
  return userId;
}

function validateGrantInput({ userId, subjectKey, keyVersion, noticeVersion }) {
  validateUserId(userId);
  if (!subjectKeyPattern.test(subjectKey || '')) throw new Error('Invalid consent subject key');
  if (!Number.isInteger(keyVersion) || keyVersion < 1 || keyVersion > 65_535) {
    throw new Error('Invalid consent key version');
  }
  if (!noticeVersionPattern.test(noticeVersion || '')) throw new Error('Invalid consent notice version');
}

function affectedRows(result) {
  return Number(result?.affectedRows || 0);
}

async function inTransaction(database, operation) {
  const connection = await database.getConnection();
  try {
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

export async function grantAnalyticsConsentRecord(database, input) {
  validateGrantInput(input);
  const { userId, subjectKey, keyVersion, noticeVersion } = input;

  return inTransaction(database, async (connection) => {
    const [rows] = await connection.query(
      `SELECT user_id, subject_key, key_version, notice_version, status
       FROM analytics_consents WHERE user_id = ? LIMIT 1 FOR UPDATE`,
      [userId],
    );
    const current = rows[0];

    if (!current) {
      await connection.query(
        `INSERT INTO analytics_consents
           (user_id, subject_key, key_version, notice_version, status, consented_at, withdrawn_at)
         VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, NULL)`,
        [userId, subjectKey, keyVersion, noticeVersion],
      );
      return { status: 'active', created: true, changed: true };
    }

    if (current.status === 'active' && current.notice_version === noticeVersion) {
      return { status: 'active', created: false, changed: false };
    }

    if (current.status === 'active') {
      await connection.query(
        `UPDATE analytics_consents
         SET notice_version = ?, consented_at = CURRENT_TIMESTAMP, withdrawn_at = NULL
         WHERE user_id = ?`,
        [noticeVersion, userId],
      );
    } else {
      await connection.query(
        `UPDATE analytics_consents
         SET subject_key = ?, key_version = ?, notice_version = ?, status = 'active',
             consented_at = CURRENT_TIMESTAMP, withdrawn_at = NULL
         WHERE user_id = ?`,
        [subjectKey, keyVersion, noticeVersion, userId],
      );
    }
    return { status: 'active', created: false, changed: true };
  });
}

export async function withdrawAnalyticsConsentRecord(database, userId) {
  validateUserId(userId);

  return inTransaction(database, async (connection) => {
    const [rows] = await connection.query(
      'SELECT subject_key, status FROM analytics_consents WHERE user_id = ? LIMIT 1 FOR UPDATE',
      [userId],
    );
    const current = rows[0];
    if (!current) return { status: 'none', changed: false, deletedEvents: 0 };

    if (current.status !== 'withdrawn') {
      await connection.query(
        `UPDATE analytics_consents
         SET status = 'withdrawn', withdrawn_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [userId],
      );
    }
    const [deletion] = await connection.query(
      'DELETE FROM analytics_events WHERE subject_key = ?',
      [current.subject_key],
    );
    return {
      status: 'withdrawn',
      changed: current.status !== 'withdrawn',
      deletedEvents: affectedRows(deletion),
    };
  });
}

export async function getAnalyticsConsentStateRecord(database, userId) {
  validateUserId(userId);
  const [rows] = await database.query(
    `SELECT status, notice_version, consented_at, withdrawn_at
     FROM analytics_consents WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return { status: 'none', noticeVersion: null, consentedAt: null, withdrawnAt: null };
  return {
    status: row.status,
    noticeVersion: row.notice_version,
    consentedAt: row.consented_at,
    withdrawnAt: row.withdrawn_at,
  };
}
