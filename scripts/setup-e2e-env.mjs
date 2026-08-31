import { access, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const outputPath = path.join(process.cwd(), '.env.e2e.local');

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required in the source environment`);
  return value;
}

function envLine(name, value) {
  return `${name}=${JSON.stringify(String(value || ''))}`;
}

async function main() {
  try {
    await access(outputPath, constants.F_OK);
    throw new Error('.env.e2e.local already exists; refusing to overwrite local credentials');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const sourceDatabase = required('DB_NAME');
  const baseName = sourceDatabase.replace(/_e2e$/i, '').replace(/[^a-zA-Z0-9_]/g, '_');
  const databaseName = `${baseName}_e2e`;
  if (databaseName.toLowerCase() === sourceDatabase.toLowerCase()) {
    throw new Error('The source environment already points to an _e2e database');
  }

  const pusherKey = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY || '';
  const pusherCluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '';
  const password = randomBytes(24).toString('base64url');
  const authSecret = randomBytes(32).toString('base64url');

  const lines = [
    '# Generated locally for the isolated ITHub E2E environment. Never commit this file.',
    envLine('DB_HOST', required('DB_HOST')),
    envLine('DB_PORT', process.env.DB_PORT || '4000'),
    envLine('DB_USER', required('DB_USER')),
    envLine('DB_PASSWORD', required('DB_PASSWORD')),
    envLine('DB_NAME', databaseName),
    '',
    envLine('ITHUB_E2E_ALLOW_WRITES', 'true'),
    envLine('ITHUB_E2E_ENVIRONMENT', 'e2e'),
    envLine('ITHUB_E2E_EMAIL', 'ithub-e2e-member@example.invalid'),
    envLine('ITHUB_E2E_PASSWORD', password),
    envLine('ITHUB_E2E_USERNAME', 'ithub_e2e_member'),
    envLine('ITHUB_E2E_BASE_URL', 'http://127.0.0.1:3000'),
    '',
    envLine('AUTH_SECRET', authSecret),
    envLine('SESSION_SECRET', authSecret),
    envLine('PUSHER_APP_ID', process.env.PUSHER_APP_ID),
    envLine('PUSHER_KEY', pusherKey),
    envLine('PUSHER_SECRET', process.env.PUSHER_SECRET),
    envLine('PUSHER_CLUSTER', pusherCluster),
    envLine('NEXT_PUBLIC_PUSHER_KEY', pusherKey),
    envLine('NEXT_PUBLIC_PUSHER_CLUSTER', pusherCluster),
    envLine('CLOUDINARY_CLOUD_NAME', ''),
    envLine('CLOUDINARY_API_KEY', ''),
    envLine('CLOUDINARY_API_SECRET', ''),
    envLine('GEMINI_API_KEY', ''),
    '',
  ];

  await writeFile(outputPath, lines.join('\n'), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  console.log(`Created ${path.basename(outputPath)} for database ${databaseName}.`);
  console.log('Generated E2E credentials were stored locally and were not printed.');
}

main().catch((error) => {
  console.error('E2E environment setup failed:', error.message);
  process.exit(1);
});
