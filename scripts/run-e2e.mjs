import { spawn } from 'node:child_process';
import { assertE2eSafety } from './e2e-safety.mjs';

assertE2eSafety();
if (!process.env.SESSION_SECRET && process.env.AUTH_SECRET) {
  process.env.SESSION_SECRET = process.env.AUTH_SECRET;
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters for the production E2E server');
}

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
