import { randomUUID } from 'node:crypto';

import db from '../lib/db.js';
import {
  grantAnalyticsConsentRecord,
  withdrawAnalyticsConsentRecord,
} from '../lib/researchConsentCore.js';
import {
  createResearchSessionKey,
  createResearchSubjectKey,
  validateAnalyticsKeyVersion,
  validateAnalyticsSecret,
} from '../lib/researchPrivacyCore.js';
import { assertE2eSafety } from './e2e-safety.mjs';

async function main() {
  assertE2eSafety({ requireCredentials: true, requireWriteOptIn: true });
  const secret = validateAnalyticsSecret(process.env.ITHUB_ANALYTICS_SECRET);
  const keyVersion = validateAnalyticsKeyVersion(process.env.ITHUB_ANALYTICS_KEY_VERSION || '1');
  const email = String(process.env.ITHUB_E2E_EMAIL || '').trim().toLowerCase();
  const [[user]] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (!user) throw new Error('Seeded E2E member was not found');

  const [[existingConsent]] = await db.query(
    'SELECT status FROM analytics_consents WHERE user_id = ? LIMIT 1',
    [user.id],
  );
  if (existingConsent) throw new Error('Refusing to overwrite an existing E2E consent record');

  const subjectKey = createResearchSubjectKey(Number(user.id), secret, keyVersion);
  const eventId = randomUUID();
  const sessionId = randomUUID();
  const sessionKey = createResearchSessionKey(subjectKey, sessionId, secret, keyVersion);
  let cleanupError = null;

  try {
    const granted = await grantAnalyticsConsentRecord(db, {
      userId: Number(user.id),
      subjectKey,
      keyVersion,
      noticeVersion: 'e2e-consent-v1',
    });
    if (granted.status !== 'active') throw new Error('Consent grant did not become active');

    await db.query(
      `INSERT INTO analytics_events
         (event_id, subject_key, session_key, data_scope, event_name, event_version,
          route_path, properties, occurred_at)
       VALUES (?, ?, ?, 'pilot', 'page_viewed', 1, '/', JSON_OBJECT(), UTC_TIMESTAMP(3))`,
      [eventId, subjectKey, sessionKey],
    );
    const [[beforeWithdrawal]] = await db.query(
      'SELECT COUNT(*) AS count FROM analytics_events WHERE subject_key = ?',
      [subjectKey],
    );
    if (Number(beforeWithdrawal.count) !== 1) throw new Error('Expected one raw event before withdrawal');

    const withdrawn = await withdrawAnalyticsConsentRecord(db, Number(user.id));
    if (withdrawn.status !== 'withdrawn' || withdrawn.deletedEvents !== 1) {
      throw new Error('Consent withdrawal did not delete the raw event');
    }

    const [[[consentAfter]], [[eventsAfter]]] = await Promise.all([
      db.query('SELECT status, withdrawn_at FROM analytics_consents WHERE user_id = ?', [user.id]),
      db.query('SELECT COUNT(*) AS count FROM analytics_events WHERE subject_key = ?', [subjectKey]),
    ]);
    if (consentAfter?.status !== 'withdrawn' || !consentAfter.withdrawn_at || Number(eventsAfter.count) !== 0) {
      throw new Error('Post-withdrawal database state is invalid');
    }
    console.log('Research consent E2E smoke passed: grant, event insert, withdrawal, and raw-event deletion.');
  } finally {
    try {
      await db.query('DELETE FROM analytics_events WHERE subject_key = ?', [subjectKey]);
      await db.query('DELETE FROM analytics_consents WHERE user_id = ?', [user.id]);
    } catch (error) {
      cleanupError = error;
    }
  }

  if (cleanupError) throw new Error(`E2E consent cleanup failed: ${cleanupError.message}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Research consent E2E smoke failed:', error.message);
    process.exit(1);
  });
