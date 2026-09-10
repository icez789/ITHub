import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { assertE2eSafety } from './e2e-safety.mjs';
import { evaluateResearchPilotReadiness } from './research-pilot-readiness-core.mjs';
import { assertResearchPreviewTarget } from './research-preview-config-core.mjs';

const execFileAsync = promisify(execFile);
const evidenceRoot = path.resolve('.vercel/release-evidence');
const defaultConfigPath = path.join(evidenceRoot, 'research-pilot-config.json');

function resolveConfigPath(args) {
  if (args.length > 1) throw new Error('invalid_arguments');
  const resolved = path.resolve(args[0] || defaultConfigPath);
  const relative = path.relative(evidenceRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('config_path_outside_evidence_root');
  }
  return resolved;
}

function safeFailureCode(error) {
  if (error?.code === 'ENOENT') return 'config_file_missing';
  if (error instanceof SyntaxError) return 'config_json_invalid';
  if (['invalid_arguments', 'config_path_outside_evidence_root'].includes(error?.message)) {
    return error.message;
  }
  return 'pilot_readiness_guard_failed';
}

try {
  const configPath = resolveConfigPath(process.argv.slice(2));
  const [configText, projectText, branchResult, commitResult] = await Promise.all([
    readFile(configPath, 'utf8'),
    readFile('.vercel/project.json', 'utf8'),
    execFileAsync('git', ['branch', '--show-current'], { encoding: 'utf8' }),
    execFileAsync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }),
  ]);
  const branch = branchResult.stdout.trim();
  const currentCommit = commitResult.stdout.trim();
  const project = JSON.parse(projectText);
  assertResearchPreviewTarget(project, branch);
  const { databaseName } = assertE2eSafety({
    requireCredentials: false,
    requireWriteOptIn: false,
  });
  const report = evaluateResearchPilotReadiness(JSON.parse(configText), {
    branch,
    currentCommit,
    databaseName,
    projectTargetVerified: true,
    now: new Date(),
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'ready') process.exitCode = 2;
} catch (error) {
  console.error(JSON.stringify({
    status: 'blocked',
    failures: [safeFailureCode(error)],
  }));
  process.exitCode = 1;
}
