import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isDiscoveryPreviewUrl, previewDatabaseIdentity } from './discovery-preview-safety.mjs';

// Usage: node --env-file=.env.e2e.local scripts/deploy-discovery-preview.mjs /path/to/vercel/dist/index.js
// This command has no production option and never changes project-wide env vars.
const databaseIdentity = previewDatabaseIdentity();
const cli = process.argv[2];
if (!cli || process.argv.length !== 3) throw new Error('Provide the installed Vercel CLI entrypoint');
const project = JSON.parse(await readFile('.vercel/project.json', 'utf8'));
if (project.projectId !== 'prj_yR99omrouUbHTC8vcFPrGbujfPUF'
  || project.orgId !== 'team_DzUs49ePhJqJD0veBMIPnY11') {
  throw new Error('The linked project is not the authorized ITHub project');
}

const values = {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT || '4000',
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  SESSION_SECRET: randomBytes(48).toString('base64url'),
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  ITHUB_DISCOVERY_FOR_YOU_ENABLED: 'false',
  ITHUB_ENVIRONMENT: 'preview',
  ITHUB_E2E_ALLOW_WRITES: 'false',
  ITHUB_E2E_ENVIRONMENT: 'preview',
  // Never inherit production service credentials into this isolated preview.
  PUSHER_APP_ID: '0',
  PUSHER_SECRET: 'preview-disabled',
  NEXT_PUBLIC_PUSHER_KEY: 'preview-disabled',
  NEXT_PUBLIC_PUSHER_CLUSTER: 'ap1',
  GEMINI_API_KEY: 'preview-disabled',
  CLOUDINARY_CLOUD_NAME: 'preview-disabled',
  CLOUDINARY_API_KEY: 'preview-disabled',
  CLOUDINARY_API_SECRET: 'preview-disabled',
};
const args = [cli, 'deploy', '--yes', '--force', '--target=preview', '--json',
  '--scope', project.orgId,
  '--meta', 'ithubDiscoveryPhase=2.1', '--meta', `ithubDatabase=${process.env.DB_NAME}`];
for (const [key, value] of Object.entries(values)) {
  args.push('--env', `${key}=${value}`, '--build-env', `${key}=${value}`);
}
// Never forward the local E2E opt-in: explicitly disable any inherited project
// overrides so deployed auth keeps secure cookies and normal rate limits.
const secrets = [values.DB_HOST, values.DB_USER, values.DB_PASSWORD,
  values.SESSION_SECRET, values.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY];
const redact = (value) => secrets.filter(Boolean).reduce((text, secret) => text.replaceAll(secret, '[REDACTED]'), value);
let stdout = '';
const code = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => process.stderr.write(redact(chunk.toString())));
  child.on('error', () => reject(new Error('Unable to start the deployment CLI')));
  child.on('exit', (exitCode) => resolve(exitCode ?? 1));
});
if (code !== 0) {
  console.error(redact(stdout));
  throw new Error(`Preview deployment failed with exit code ${code}`);
}
const urls = stdout.match(/https:\/\/it-[a-z0-9]+-thiraphat-s-projects\.vercel\.app/g) || [];
const url = urls.find(isDiscoveryPreviewUrl);
if (!url) {
  console.log(redact(stdout));
  throw new Error('Deployment completed but no verified Preview URL was returned');
}
await mkdir('.vercel/release-evidence', { recursive: true });
const manifest = { url, phase: '2.1', database: process.env.DB_NAME, databaseIdentity, deployedAt: new Date().toISOString() };
await writeFile('.vercel/release-evidence/preview-deployment.json', JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ url, phase: '2.1', database: process.env.DB_NAME, status: 'ready' }));
