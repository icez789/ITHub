export const RESEARCH_PREVIEW_BRANCH = 'codex/feedback-research-analytics';
export const RESEARCH_PREVIEW_WRITE_CONFIRMATION = '--confirm-branch-preview-write';

export const RESEARCH_PREVIEW_PROJECT = Object.freeze({
  projectId: 'prj_yR99omrouUbHTC8vcFPrGbujfPUF',
  orgId: 'team_DzUs49ePhJqJD0veBMIPnY11',
});

const requiredDatabaseKeys = Object.freeze([
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
]);

function requiredValue(value, label) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`Missing value for ${label}`);
  return normalized;
}

export function assertResearchPreviewTarget(project, branch = RESEARCH_PREVIEW_BRANCH) {
  if (branch !== RESEARCH_PREVIEW_BRANCH) {
    throw new Error('Only the authorized research release branch is supported');
  }
  if (
    project?.projectId !== RESEARCH_PREVIEW_PROJECT.projectId
    || project?.orgId !== RESEARCH_PREVIEW_PROJECT.orgId
  ) {
    throw new Error('The linked project is not the authorized ITHub project');
  }
  return { branch, ...RESEARCH_PREVIEW_PROJECT };
}

export function buildResearchPreviewCliArgs(cli, name, sensitive) {
  const entrypoint = requiredValue(cli, 'Vercel CLI entrypoint');
  const variableName = requiredValue(name, 'environment variable name');
  if (!/^[A-Z][A-Z0-9_]*$/.test(variableName)) {
    throw new Error('Invalid environment variable name');
  }
  return [
    entrypoint,
    'env',
    'add',
    variableName,
    'preview',
    '--git-branch',
    RESEARCH_PREVIEW_BRANCH,
    '--yes',
    '--scope',
    RESEARCH_PREVIEW_PROJECT.orgId,
    sensitive ? '--sensitive' : '--no-sensitive',
  ];
}

export function buildResearchPreviewListArgs(cli) {
  return [
    requiredValue(cli, 'Vercel CLI entrypoint'),
    'env',
    'ls',
    'preview',
    RESEARCH_PREVIEW_BRANCH,
    '--json',
    '--scope',
    RESEARCH_PREVIEW_PROJECT.orgId,
    '--no-color',
  ];
}

export function assertResearchPreviewBranchIsEmpty(rawOutput) {
  const text = String(rawOutput ?? '');
  const jsonStart = text.indexOf('{');
  if (jsonStart < 0) throw new Error('Vercel Preview preflight did not return JSON');
  let parsed;
  try {
    parsed = JSON.parse(text.slice(jsonStart));
  } catch {
    throw new Error('Vercel Preview preflight returned invalid JSON');
  }
  if (!Array.isArray(parsed?.envs)) {
    throw new Error('Vercel Preview preflight did not return an environment list');
  }
  if (parsed.envs.length > 0) {
    throw new Error('Research Preview branch already has environment overrides; refusing implicit rotation');
  }
  return { existingOverrideCount: 0 };
}

export function parseResearchPreviewCommand(args) {
  if (!Array.isArray(args) || args.length === 0) {
    throw new Error('Provide --dry-run or the installed Vercel CLI entrypoint');
  }
  if (args[0] === '--dry-run') {
    if (args.length !== 1) throw new Error('Dry-run does not accept additional arguments');
    return { dryRun: true, cli: null };
  }
  if (args.length !== 2 || args[1] !== RESEARCH_PREVIEW_WRITE_CONFIRMATION) {
    throw new Error(`Remote configuration requires ${RESEARCH_PREVIEW_WRITE_CONFIRMATION}`);
  }
  return { dryRun: false, cli: requiredValue(args[0], 'Vercel CLI entrypoint') };
}

export function buildResearchPreviewVariables(environment, generatedSecrets) {
  const database = Object.fromEntries(requiredDatabaseKeys.map((name) => [
    name,
    requiredValue(environment?.[name] ?? (name === 'DB_PORT' ? '4000' : ''), name),
  ]));
  if (!database.DB_NAME.toLowerCase().endsWith('_e2e')) {
    throw new Error('Preview DB_NAME must end with _e2e');
  }

  const secrets = {
    session: requiredValue(generatedSecrets?.session, 'generated session secret'),
    serverAction: requiredValue(generatedSecrets?.serverAction, 'generated Server Action key'),
    analytics: requiredValue(generatedSecrets?.analytics, 'generated Analytics secret'),
    e2ePassword: requiredValue(generatedSecrets?.e2ePassword, 'generated disabled E2E password'),
  };
  if (Object.values(secrets).some((value) => value.length < 32)) {
    throw new Error('Generated Preview secrets must contain at least 32 characters');
  }
  if (new Set(Object.values(secrets)).size !== Object.values(secrets).length) {
    throw new Error('Preview secrets must be independent values');
  }
  const inheritedSecrets = [
    environment?.SESSION_SECRET,
    environment?.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,
    environment?.ITHUB_ANALYTICS_SECRET,
    environment?.ITHUB_E2E_PASSWORD,
  ].filter(Boolean);
  if (Object.values(secrets).some((value) => inheritedSecrets.includes(value))) {
    throw new Error('Preview secrets must not reuse local or Production-shaped values');
  }

  return [
    ['DB_HOST', database.DB_HOST, true],
    ['DB_PORT', database.DB_PORT, true],
    ['DB_USER', database.DB_USER, true],
    ['DB_PASSWORD', database.DB_PASSWORD, true],
    ['DB_NAME', database.DB_NAME, true],
    ['SESSION_SECRET', secrets.session, true],
    ['NEXT_SERVER_ACTIONS_ENCRYPTION_KEY', secrets.serverAction, true],
    ['ITHUB_ANALYTICS_SECRET', secrets.analytics, true],
    ['ITHUB_ANALYTICS_KEY_VERSION', '1', false],
    ['ITHUB_DISCOVERY_FOR_YOU_ENABLED', 'true', false],
    ['ITHUB_ENVIRONMENT', 'preview', false],
    ['ITHUB_E2E_ALLOW_WRITES', 'false', false],
    ['ITHUB_E2E_ENVIRONMENT', 'preview', false],
    ['ITHUB_E2E_EMAIL', 'preview-disabled@example.invalid', true],
    ['ITHUB_E2E_PASSWORD', secrets.e2ePassword, true],
    ['ITHUB_E2E_USERNAME', 'preview_disabled', true],
    ['ITHUB_E2E_BASE_URL', 'https://preview.invalid', false],
    ['ITHUB_RESEARCH_RETENTION_ALLOW_WRITES', 'false', false],
    ['ITHUB_RESEARCH_RETENTION_ALLOW_PRODUCTION', 'false', false],
    ['PUSHER_APP_ID', '0', false],
    ['PUSHER_SECRET', 'preview-disabled', true],
    ['PUSHER_KEY', 'preview-disabled', true],
    ['PUSHER_CLUSTER', 'ap1', false],
    ['NEXT_PUBLIC_PUSHER_KEY', 'preview-disabled', false],
    ['NEXT_PUBLIC_PUSHER_CLUSTER', 'ap1', false],
    ['GEMINI_API_KEY', 'preview-disabled', true],
    ['CLOUDINARY_CLOUD_NAME', 'preview-disabled', false],
    ['CLOUDINARY_API_KEY', 'preview-disabled', true],
    ['CLOUDINARY_API_SECRET', 'preview-disabled', true],
  ];
}
