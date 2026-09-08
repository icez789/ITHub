import 'server-only';

import {
  createResearchSessionKey,
  createResearchSubjectKey,
  validateAnalyticsKeyVersion,
  validateAnalyticsSecret,
} from './researchPrivacyCore';

export function getAnalyticsKeyVersion() {
  return validateAnalyticsKeyVersion(process.env.ITHUB_ANALYTICS_KEY_VERSION || '1');
}

export function getAnalyticsSecret() {
  return validateAnalyticsSecret(process.env.ITHUB_ANALYTICS_SECRET);
}

export function createSubjectKeyForUser(userId) {
  const keyVersion = getAnalyticsKeyVersion();
  return {
    keyVersion,
    subjectKey: createResearchSubjectKey(userId, getAnalyticsSecret(), keyVersion),
  };
}

export function createSessionKeyForSubject(subjectKey, sessionId, keyVersion = getAnalyticsKeyVersion()) {
  return createResearchSessionKey(subjectKey, sessionId, getAnalyticsSecret(), keyVersion);
}
