import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { assertE2eSafety } from './e2e-safety.mjs';

assertE2eSafety();
// Exercise Phase 2.2 locally; releases explicitly enable it after Phase 2.1 smoke.
process.env.ITHUB_DISCOVERY_FOR_YOU_ENABLED ??= 'true';
if (!process.env.SESSION_SECRET && process.env.AUTH_SECRET) {
  process.env.SESSION_SECRET = process.env.AUTH_SECRET;
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters for the production E2E server');
}
// Research pseudonyms need a real non-placeholder key, but isolated E2E rows are
// deleted after each test. Generate a process-scoped key instead of persisting a
// test secret or falling back to an unrelated credential.
process.env.ITHUB_ANALYTICS_SECRET ||= randomBytes(32).toString('hex');
process.env.ITHUB_ANALYTICS_KEY_VERSION ||= '1';

function run(commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) reject(new Error(`Command stopped by ${signal}`));
      else resolve(code ?? 1);
    });
  });
}

const playwrightCli = process.platform === 'win32'
  ? 'node_modules\\@playwright\\test\\cli.js'
  : 'node_modules/@playwright/test/cli.js';
const nextCli = process.platform === 'win32'
  ? 'node_modules\\next\\dist\\bin\\next'
  : 'node_modules/next/dist/bin/next';

async function main() {
  const forwardedArgs = process.argv.slice(2);
  if (!forwardedArgs.includes('--list')) {
    const buildCode = await run([nextCli, 'build']);
    if (buildCode !== 0) throw new Error(`E2E production build failed with exit code ${buildCode}`);
  }
  const testCode = await run([playwrightCli, 'test', '--workers=1', ...forwardedArgs]);
  process.exit(testCode);
}

main().catch((error) => {
  console.error('Unable to run Playwright:', error.message);
  process.exit(1);
});
