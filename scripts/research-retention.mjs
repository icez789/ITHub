import db from '../lib/db.js';
import {
  formatResearchFailureAudit,
  formatResearchRetentionAudit,
} from '../lib/researchAuditCore.js';
import { runResearchRetentionCleanup } from '../lib/researchRetentionCore.js';
import { assertE2eSafety } from './e2e-safety.mjs';

const executeFlag = process.argv.includes('--execute');
const dryRunFlag = process.argv.includes('--dry-run');
const e2eFlag = process.argv.includes('--e2e');

function configurationError(message) {
  const error = new Error(message);
  error.code = 'CONFIGURATION_ERROR';
  return error;
}

function assertModeSafety() {
  if (executeFlag && dryRunFlag) {
    throw configurationError('Choose either --dry-run or --execute');
  }
  if (e2eFlag) {
    assertE2eSafety({ requireCredentials: true, requireWriteOptIn: executeFlag });
    return;
  }
  if (!executeFlag) return;

  if (String(process.env.ITHUB_RESEARCH_RETENTION_ALLOW_WRITES).toLowerCase() !== 'true') {
    throw configurationError('Retention execute mode requires explicit write opt-in');
  }
  const environment = String(
    process.env.ITHUB_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || '',
  ).toLowerCase();
  if (
    ['production', 'prod', 'live'].includes(environment)
    && String(process.env.ITHUB_RESEARCH_RETENTION_ALLOW_PRODUCTION).toLowerCase() !== 'true'
  ) {
    throw configurationError('Production retention cleanup requires a second explicit opt-in');
  }
}

async function main() {
  assertModeSafety();
  const report = await runResearchRetentionCleanup(db, { execute: executeFlag });
  console.log(formatResearchRetentionAudit(report));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(formatResearchFailureAudit('research_retention_cleanup', error));
    process.exit(1);
  });
