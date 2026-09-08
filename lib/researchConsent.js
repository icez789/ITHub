import 'server-only';

import db from './db';
import {
  getAnalyticsConsentStateRecord,
  grantAnalyticsConsentRecord,
  withdrawAnalyticsConsentRecord,
} from './researchConsentCore';
import { createSubjectKeyForUser } from './researchPrivacy';

export function getAnalyticsConsentState(userId) {
  return getAnalyticsConsentStateRecord(db, userId);
}

export function grantAnalyticsConsent(userId, noticeVersion) {
  const { subjectKey, keyVersion } = createSubjectKeyForUser(userId);
  return grantAnalyticsConsentRecord(db, {
    userId,
    subjectKey,
    keyVersion,
    noticeVersion,
  });
}

export function withdrawAnalyticsConsent(userId) {
  return withdrawAnalyticsConsentRecord(db, userId);
}
