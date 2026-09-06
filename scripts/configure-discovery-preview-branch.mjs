import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { previewDatabaseIdentity } from './discovery-preview-safety.mjs';

// Pins Git-triggered deploys for this release branch to the isolated E2E
// database. There is deliberately no Production target in this helper.
const [cli, branch = 'codex/ithub-94-milestone', phase = '2.2'] = process.argv.slice(2);
if (!cli || process.argv.length > 5) throw new Error('Provide the Vercel CLI entrypoint, optional branch and phase');
if (branch !== 'codex/ithub-94-milestone') throw new Error('Only the authorized release branch is supported');
if (!['2.1', '2.2'].includes(phase)) throw new Error('Release phase must be 2.1 or 2.2');
const databaseIdentity = previewDatabaseIdentity();
const project = JSON.parse(await readFile('.vercel/project.json', 'utf8'));
if (project.projectId !== 'prj_yR99omrouUbHTC8vcFPrGbujfPUF'
  || project.orgId !== 'team_DzUs49ePhJqJD0veBMIPnY11') {
  throw new Error('The linked project is not the authorized ITHub project');
}

const variables = [
  ['DB_HOST', process.env.DB_HOST, true],
  ['DB_PORT', process.env.DB_PORT || '4000', true],
  ['DB_USER', process.env.DB_USER, true],
  ['DB_PASSWORD', process.env.DB_PASSWORD, true],
  ['DB_NAME', process.env.DB_NAME, true],
  ['SESSION_SECRET', randomBytes(48).toString('base64url'), true],
  ['NEXT_SERVER_ACTIONS_ENCRYPTION_KEY', randomBytes(32).toString('base64'), true],
  ['ITHUB_DISCOVERY_FOR_YOU_ENABLED', phase === '2.2' ? 'true' : 'false', false],
  ['ITHUB_ENVIRONMENT', 'preview', false],
  ['ITHUB_E2E_ALLOW_WRITES', 'false', false],
  ['ITHUB_E2E_ENVIRONMENT', 'preview', false],
  ['PUSHER_APP_ID', '0', false],
  ['PUSHER_SECRET', 'preview-disabled', true],
  ['NEXT_PUBLIC_PUSHER_KEY', 'preview-disabled', false],
  ['NEXT_PUBLIC_PUSHER_CLUSTER', 'ap1', false],
  ['GEMINI_API_KEY', 'preview-disabled', true],
  ['CLOUDINARY_CLOUD_NAME', 'preview-disabled', false],
  ['CLOUDINARY_API_KEY', 'preview-disabled', true],
  ['CLOUDINARY_API_SECRET', 'preview-disabled', true],
];

for (const [name, value, sensitive] of variables) {
  if (!value) throw new Error(`Missing value for ${name}`);
  const args = [cli, 'env', 'add', name, 'preview', '--git-branch', branch,
    '--force', '--yes', '--scope', project.orgId, sensitive ? '--sensitive' : '--no-sensitive'];
  const output = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
    let text = '';
    child.stdout.on('data', (chunk) => { text += chunk.toString(); });
    child.stderr.on('data', (chunk) => { text += chunk.toString(); });
    child.on('error', () => reject(new Error(`Unable to configure ${name}`)));
    child.on('exit', (code) => code === 0 ? resolve(text) : reject(new Error(`Unable to configure ${name}`)));
    child.stdin.end(`${value}\n`);
  });
  if (/error/i.test(output)) throw new Error(`Vercel rejected ${name}`);
  console.log(`Configured ${name} for Preview branch`);
}

await mkdir('.vercel/release-evidence', { recursive: true });
await writeFile('.vercel/release-evidence/branch-preview-config.json', JSON.stringify({
  branch, phase, database: process.env.DB_NAME, databaseIdentity, configuredAt: new Date().toISOString(),
}, null, 2));
console.log(JSON.stringify({ branch, phase, database: process.env.DB_NAME, status: 'configured' }));
