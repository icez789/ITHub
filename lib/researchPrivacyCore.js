import { createHmac } from 'node:crypto';

export const ANALYTICS_SECRET_MIN_LENGTH = 32;

const placeholderPattern = /preview-disabled|change[-_ ]?me|replace[-_ ]?me|placeholder|your[-_ ]?secret/i;
const subjectKeyPattern = /^[a-f0-9]{64}$/;
const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateAnalyticsSecret(value) {
  if (typeof value !== 'string'
    || value.length < ANALYTICS_SECRET_MIN_LENGTH
    || placeholderPattern.test(value)) {
    throw new Error(`ITHUB_ANALYTICS_SECRET must be a non-placeholder value with at least ${ANALYTICS_SECRET_MIN_LENGTH} characters`);
  }
  return value;
}

export function validateAnalyticsKeyVersion(value) {
  const version = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(version) || version < 1 || version > 65_535) {
    throw new Error('Analytics key version must be an integer from 1 to 65535');
  }
  return version;
}

function hmacHex(secret, context) {
  return createHmac('sha256', validateAnalyticsSecret(secret)).update(context, 'utf8').digest('hex');
}

export function createResearchSubjectKey(userId, secret, keyVersion = 1) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Research subject user id must be a positive integer');
  }
  const version = validateAnalyticsKeyVersion(keyVersion);
  return hmacHex(secret, `ithub:research:subject:v${version}:user:${userId}`);
}

export function createResearchSessionKey(subjectKey, sessionId, secret, keyVersion = 1) {
  if (!subjectKeyPattern.test(subjectKey || '')) throw new Error('Invalid research subject key');
  if (!sessionIdPattern.test(sessionId || '')) throw new Error('Invalid analytics session id');
  const version = validateAnalyticsKeyVersion(keyVersion);
  return hmacHex(secret, `ithub:research:session:v${version}:subject:${subjectKey}:session:${sessionId.toLowerCase()}`);
}
