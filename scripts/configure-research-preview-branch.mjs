import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { previewDatabaseIdentity } from './discovery-preview-safety.mjs';
import {
  assertResearchPreviewBranchIsEmpty,
  assertResearchPreviewTarget,
  buildResearchPreviewCliArgs,
  buildResearchPreviewListArgs,
  buildResearchPreviewVariables,
  classifyResearchPreviewCliFailure,
  parseResearchPreviewCommand,
  RESEARCH_PREVIEW_BRANCH,
} from './research-preview-config-core.mjs';

// Validates or configures only branch-scoped Preview variables. There is
// deliberately no Production target and no option to select another branch.
const { dryRun, cli } = parseResearchPreviewCommand(process.argv.slice(2));
const databaseIdentity = previewDatabaseIdentity();
const project = JSON.parse(await readFile('.vercel/project.json', 'utf8'));
assertResearchPreviewTarget(project);

const variables = buildResearchPreviewVariables(process.env, {
  session: randomBytes(48).toString('base64url'),
  serverAction: randomBytes(32).toString('base64'),
  analytics: randomBytes(48).toString('base64url'),
  e2ePassword: randomBytes(48).toString('base64url'),
});
const evidencePath = '.vercel/release-evidence/research-branch-preview-config.json';

if (!dryRun) {
  const preflightOutput = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, buildResearchPreviewListArgs(cli), {
      stdio: ['ignore', 'pipe', 'ignore'],
      env: process.env,
    });
    let text = '';
    child.stdout.on('data', (chunk) => { text += chunk.toString(); });
    child.on('error', () => reject(new Error('Unable to inspect research Preview variables')));
    child.on('exit', (code) => {
      if (code === 0) resolve(text);
      else reject(new Error('Unable to inspect research Preview variables'));
    });
  });
  assertResearchPreviewBranchIsEmpty(preflightOutput);

  for (const [name, value, sensitive] of variables) {
    const args = buildResearchPreviewCliArgs(cli, name, sensitive);
    const output = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
      });
      let text = '';
      child.stdout.on('data', (chunk) => { text += chunk.toString(); });
      child.stderr.on('data', (chunk) => { text += chunk.toString(); });
      child.on('error', () => reject(new Error(`Unable to configure ${name}`)));
      child.on('exit', (code) => {
        if (code === 0) resolve(text);
        else reject(new Error(
          `Unable to configure ${name} (${classifyResearchPreviewCliFailure(text)})`,
        ));
      });
      child.stdin.end(`${value}\n`);
    });
    if (/\berror\b/i.test(output)) throw new Error(`Vercel rejected ${name}`);
    console.log(`Configured ${name} for research Preview branch`);
  }
}

await mkdir('.vercel/release-evidence', { recursive: true });
await writeFile(evidencePath, JSON.stringify({
  branch: RESEARCH_PREVIEW_BRANCH,
  database: process.env.DB_NAME,
  databaseIdentity,
  variableNames: variables.map(([name]) => name),
  status: dryRun ? 'validated-local-only' : 'configured',
  checkedAt: new Date().toISOString(),
}, null, 2));

console.log(JSON.stringify({
  branch: RESEARCH_PREVIEW_BRANCH,
  database: process.env.DB_NAME,
  variableCount: variables.length,
  status: dryRun ? 'validated-local-only' : 'configured',
}));
