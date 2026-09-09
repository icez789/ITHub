import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertResearchPreviewBranchIsEmpty,
  assertResearchPreviewTarget,
  buildResearchPreviewCliArgs,
  buildResearchPreviewListArgs,
  buildResearchPreviewVariables,
  classifyResearchPreviewCliFailure,
  parseResearchPreviewCommand,
  RESEARCH_PREVIEW_BRANCH,
  RESEARCH_PREVIEW_PROJECT,
  RESEARCH_PREVIEW_WRITE_CONFIRMATION,
} from '../../scripts/research-preview-config-core.mjs';

const databaseEnvironment = Object.freeze({
  DB_HOST: 'preview-db.example.invalid',
  DB_PORT: '4000',
  DB_USER: 'preview-user',
  DB_PASSWORD: 'preview-database-password',
  DB_NAME: 'test_e2e',
  SESSION_SECRET: 'local-session-secret-that-must-not-be-reused',
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: 'local-action-key-that-must-not-be-reused',
  ITHUB_ANALYTICS_SECRET: 'local-analytics-secret-that-must-not-be-reused',
  ITHUB_E2E_PASSWORD: 'local-e2e-password-that-must-not-be-reused',
});

const generatedSecrets = Object.freeze({
  session: 'preview-session-secret-with-more-than-32-characters',
  serverAction: 'preview-action-key-with-more-than-32-characters',
  analytics: 'preview-analytics-key-with-more-than-32-characters',
  e2ePassword: 'preview-disabled-e2e-password-with-more-than-32-characters',
});

test('research Preview target accepts only the authorized project and branch', () => {
  assert.deepEqual(
    assertResearchPreviewTarget(RESEARCH_PREVIEW_PROJECT),
    { branch: RESEARCH_PREVIEW_BRANCH, ...RESEARCH_PREVIEW_PROJECT },
  );
  assert.throws(
    () => assertResearchPreviewTarget(RESEARCH_PREVIEW_PROJECT, 'main'),
    /authorized research release branch/,
  );
  assert.throws(
    () => assertResearchPreviewTarget({ ...RESEARCH_PREVIEW_PROJECT, projectId: 'other' }),
    /authorized ITHub project/,
  );
});

test('research Preview variables isolate database, secrets, writes, and external services', () => {
  const variables = buildResearchPreviewVariables(databaseEnvironment, generatedSecrets);
  const values = new Map(variables.map(([name, value, sensitive]) => [name, { value, sensitive }]));

  assert.equal(variables.length, new Set(variables.map(([name]) => name)).size);
  assert.equal(values.get('DB_NAME').value, 'test_e2e');
  assert.equal(values.get('SESSION_SECRET').value, generatedSecrets.session);
  assert.equal(values.get('NEXT_SERVER_ACTIONS_ENCRYPTION_KEY').value, generatedSecrets.serverAction);
  assert.equal(values.get('ITHUB_ANALYTICS_SECRET').value, generatedSecrets.analytics);
  assert.equal(values.get('ITHUB_ANALYTICS_KEY_VERSION').value, '1');
  assert.equal(values.get('ITHUB_DISCOVERY_FOR_YOU_ENABLED').value, 'true');
  assert.equal(values.get('ITHUB_E2E_ALLOW_WRITES').value, 'false');
  assert.equal(values.get('ITHUB_E2E_ENVIRONMENT').value, 'preview');
  assert.equal(values.get('ITHUB_E2E_EMAIL').value, 'preview-disabled@example.invalid');
  assert.equal(values.get('ITHUB_E2E_PASSWORD').value, generatedSecrets.e2ePassword);
  assert.equal(values.get('ITHUB_E2E_USERNAME').value, 'preview_disabled');
  assert.equal(values.get('ITHUB_E2E_BASE_URL').value, 'https://preview.invalid');
  assert.equal(values.get('ITHUB_RESEARCH_RETENTION_ALLOW_WRITES').value, 'false');
  assert.equal(values.get('ITHUB_RESEARCH_RETENTION_ALLOW_PRODUCTION').value, 'false');
  assert.equal(values.get('PUSHER_SECRET').value, 'preview-disabled');
  assert.equal(values.get('PUSHER_KEY').value, 'preview-disabled');
  assert.equal(values.get('PUSHER_CLUSTER').value, 'ap1');
  assert.equal(values.get('GEMINI_API_KEY').value, 'preview-disabled');
  assert.equal(values.get('CLOUDINARY_API_SECRET').value, 'preview-disabled');
  for (const name of [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'SESSION_SECRET',
    'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY',
    'ITHUB_ANALYTICS_SECRET',
    'ITHUB_E2E_EMAIL',
    'ITHUB_E2E_PASSWORD',
    'ITHUB_E2E_USERNAME',
    'PUSHER_KEY',
  ]) {
    assert.equal(values.get(name).sensitive, true, `${name} must be stored as sensitive`);
  }
});

test('research Preview CLI arguments cannot target Production or another branch', () => {
  assert.equal(RESEARCH_PREVIEW_WRITE_CONFIRMATION, '--confirm-branch-preview-write');
  assert.deepEqual(parseResearchPreviewCommand(['--dry-run']), { dryRun: true, cli: null });
  assert.deepEqual(
    parseResearchPreviewCommand(['vercel-cli.js', RESEARCH_PREVIEW_WRITE_CONFIRMATION]),
    { dryRun: false, cli: 'vercel-cli.js' },
  );
  assert.throws(() => parseResearchPreviewCommand(['vercel-cli.js']), /requires/);
  assert.throws(() => parseResearchPreviewCommand(['--dry-run', 'extra']), /does not accept/);
  const args = buildResearchPreviewCliArgs('vercel-cli.js', 'ITHUB_ANALYTICS_SECRET', true);
  assert.deepEqual(args.slice(0, 5), [
    'vercel-cli.js',
    'env',
    'add',
    'ITHUB_ANALYTICS_SECRET',
    'preview',
  ]);
  assert.equal(args[args.indexOf('--git-branch') + 1], RESEARCH_PREVIEW_BRANCH);
  assert.equal(args[args.indexOf('--scope') + 1], RESEARCH_PREVIEW_PROJECT.orgId);
  assert.equal(args.includes('--sensitive'), true);
  assert.equal(args.includes('--force'), true);
  assert.equal(args.some((value) => String(value).toLowerCase() === 'production'), false);
  assert.equal(buildResearchPreviewCliArgs('vercel-cli.js', 'ITHUB_ENVIRONMENT', false).at(-1), '--no-sensitive');
  assert.throws(
    () => buildResearchPreviewCliArgs('vercel-cli.js', 'unsafe-name', false),
    /Invalid environment variable name/,
  );
  const listArgs = buildResearchPreviewListArgs('vercel-cli.js');
  assert.deepEqual(listArgs.slice(0, 5), [
    'vercel-cli.js',
    'env',
    'ls',
    'preview',
    RESEARCH_PREVIEW_BRANCH,
  ]);
  assert.deepEqual(
    assertResearchPreviewBranchIsEmpty('Retrieving project…\n{"envs":[]}'),
    { existingOverrideCount: 0 },
  );
  assert.throws(
    () => assertResearchPreviewBranchIsEmpty('{"envs":[{"key":"SESSION_SECRET"}]}'),
    /refusing implicit rotation/,
  );
  assert.throws(() => assertResearchPreviewBranchIsEmpty('not json'), /did not return JSON/);
});

test('research Preview CLI failures expose only a safe classification', () => {
  assert.equal(
    classifyResearchPreviewCliFailure('{"status":"error","reason":"branch_not_found","message":"secret text"}'),
    'branch_not_found',
  );
  assert.equal(classifyResearchPreviewCliFailure('Environment already exists'), 'environment_conflict');
  assert.equal(classifyResearchPreviewCliFailure('unrecognized failure'), 'unknown_cli_error');
});

test('research Preview variable builder rejects unsafe database and secret reuse', () => {
  assert.throws(
    () => buildResearchPreviewVariables({ ...databaseEnvironment, DB_NAME: 'production' }, generatedSecrets),
    /must end with _e2e/,
  );
  assert.throws(
    () => buildResearchPreviewVariables(databaseEnvironment, {
      ...generatedSecrets,
      analytics: generatedSecrets.session,
    }),
    /independent values/,
  );
  assert.throws(
    () => buildResearchPreviewVariables(databaseEnvironment, {
      ...generatedSecrets,
      analytics: databaseEnvironment.ITHUB_ANALYTICS_SECRET,
    }),
    /must not reuse/,
  );
});
