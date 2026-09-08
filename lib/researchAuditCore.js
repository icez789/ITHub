const retentionModes = new Set(['dry_run', 'execute']);
const safeErrorCodes = new Set([
  'CONFIGURATION_ERROR',
  'ECONNRESET',
  'E2E_ASSERTION_FAILED',
  'E2E_CLEANUP_FAILED',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR',
  'ER_LOCK_DEADLOCK',
  'ER_LOCK_WAIT_TIMEOUT',
]);
const aggregateKeys = Object.freeze([
  'analyticsEvents',
  'evaluationResponses',
  'feedbackSubmissions',
]);

function safeTimestamp(value) {
  if (typeof value !== 'string' || !value.endsWith('Z') || !Number.isFinite(Date.parse(value))) {
    throw new Error('Research audit requires a valid UTC timestamp');
  }
  return value;
}

function safeCounts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Research audit requires aggregate counts');
  }
  return Object.fromEntries(aggregateKeys.map((key) => {
    const count = value[key];
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error('Research audit aggregate count must be a non-negative safe integer');
    }
    return [key, count];
  }));
}

export function formatResearchRetentionAudit(report) {
  if (report?.version !== 1 || report?.operation !== 'research_retention_cleanup') {
    throw new Error('Invalid research retention audit contract');
  }
  if (!retentionModes.has(report.mode)) throw new Error('Invalid research retention audit mode');
  return JSON.stringify({
    version: 1,
    operation: 'research_retention_cleanup',
    mode: report.mode,
    asOfUtc: safeTimestamp(report.asOfUtc),
    rawAnalyticsCutoffUtc: safeTimestamp(report.rawAnalyticsCutoffUtc),
    eligible: safeCounts(report.eligible),
    deleted: safeCounts(report.deleted),
  });
}

export function safeResearchErrorCode(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  return safeErrorCodes.has(code) ? code : 'UNKNOWN';
}

export function formatResearchFailureAudit(operation, error) {
  if (operation !== 'research_retention_cleanup') {
    throw new Error('Invalid research failure audit operation');
  }
  return JSON.stringify({
    version: 1,
    operation,
    outcome: 'failure',
    errorCode: safeResearchErrorCode(error),
  });
}
