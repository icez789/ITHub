import { spawn } from 'node:child_process';
import { assertE2eSafety } from './e2e-safety.mjs';

assertE2eSafety();

const playwrightCli = process.platform === 'win32'
  ? 'node_modules\\@playwright\\test\\cli.js'
  : 'node_modules/@playwright/test/cli.js';
const args = [playwrightCli, 'test', '--workers=1', ...process.argv.slice(2)];
const child = spawn(process.execPath, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('Unable to start Playwright:', error.message);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Playwright stopped by ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
