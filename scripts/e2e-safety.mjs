const productionLabels = new Set(['production', 'prod', 'live']);

export function assertE2eSafety({ requireCredentials = true, requireWriteOptIn = true } = {}) {
  const failures = [];
  const databaseName = String(process.env.DB_NAME || '').trim();
  const environment = String(
    process.env.ITHUB_E2E_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || '',
  ).trim().toLowerCase();

  if (!databaseName.toLowerCase().endsWith('_e2e')) {
    failures.push('DB_NAME must end with _e2e');
  }
  if (productionLabels.has(environment)) {
    failures.push('E2E commands cannot run when the environment is production');
  }
  if (requireWriteOptIn && String(process.env.ITHUB_E2E_ALLOW_WRITES).toLowerCase() !== 'true') {
    failures.push('ITHUB_E2E_ALLOW_WRITES must be exactly true');
  }
  if (requireCredentials) {
    if (!String(process.env.ITHUB_E2E_EMAIL || '').trim()) failures.push('ITHUB_E2E_EMAIL is required');
    if (!String(process.env.ITHUB_E2E_PASSWORD || '')) failures.push('ITHUB_E2E_PASSWORD is required');
  }

  if (failures.length) {
    throw new Error(`E2E safety guard blocked this command: ${failures.join('; ')}`);
  }

  return { databaseName, environment: environment || 'e2e' };
}

export function assertE2eFlag(options) {
  if (!process.argv.includes('--e2e')) return null;
  return assertE2eSafety(options);
}
