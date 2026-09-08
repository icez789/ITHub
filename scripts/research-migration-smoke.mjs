import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

import mysql from 'mysql2/promise';

import { assertE2eSafety } from './e2e-safety.mjs';

const execFileAsync = promisify(execFile);
const temporaryDatabasePattern = /^ithub_research_(?:fresh|partial)_\d{13}_[a-f0-9]{8}_e2e$/;

function createTemporaryDatabaseName(kind, timestamp, suffix) {
  const name = `ithub_research_${kind}_${timestamp}_${suffix}_e2e`;
  if (!temporaryDatabasePattern.test(name)) {
    throw new Error('Generated E2E database name failed the strict safety pattern');
  }
  return name;
}

function quoteTemporaryDatabaseName(name) {
  if (!temporaryDatabasePattern.test(name)) {
    throw new Error(`Refusing database operation for unsafe name: ${name}`);
  }
  return `\`${name}\``;
}

function connectionOptions(database) {
  return {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    port: Number(process.env.DB_PORT || 4000),
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    connectTimeout: 10_000,
  };
}

async function runDatabaseScript(script, databaseName, { expectFailure = false } = {}) {
  try {
    const result = await execFileAsync(process.execPath, [script, '--e2e'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DB_NAME: databaseName,
        ITHUB_E2E_ALLOW_WRITES: 'true',
      },
      maxBuffer: 2 * 1024 * 1024,
    });
    if (expectFailure) {
      throw new Error(`${script} unexpectedly succeeded against a partial schema`);
    }
    return `${result.stdout || ''}\n${result.stderr || ''}`;
  } catch (error) {
    if (!expectFailure) {
      const detail = `${error.stdout || ''}\n${error.stderr || ''}`.trim();
      throw new Error(`${script} failed for ${databaseName}${detail ? `: ${detail}` : ''}`);
    }
    return `${error.stdout || ''}\n${error.stderr || ''}`;
  }
}

async function createDatabase(server, databaseName) {
  await server.query(
    `CREATE DATABASE ${quoteTemporaryDatabaseName(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
  );
}

async function dropDatabase(server, databaseName) {
  await server.query(`DROP DATABASE IF EXISTS ${quoteTemporaryDatabaseName(databaseName)}`);
}

async function makeMigration005Partial(databaseName) {
  const connection = await mysql.createConnection(connectionOptions(databaseName));
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query(
      'DROP TABLE analytics_events, analytics_consents, evaluation_responses, feedback_submissions',
    );
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.query(
      "DELETE FROM schema_migrations WHERE name = '005_feedback_and_research_analytics.sql'",
    );
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    await connection.end();
  }
}

async function assertOnlyOneMigration005TableRemains(databaseName) {
  const connection = await mysql.createConnection(connectionOptions(databaseName));
  try {
    const [[row]] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = ?
         AND table_name IN (
           'evaluation_campaigns', 'analytics_consents', 'analytics_events',
           'evaluation_responses', 'feedback_submissions'
         )`,
      [databaseName],
    );
    if (Number(row.count) !== 1) {
      throw new Error('Partial migration guard mutated the intentionally partial schema');
    }
  } finally {
    await connection.end();
  }
}

async function main() {
  assertE2eSafety({ requireCredentials: true, requireWriteOptIn: true });

  const timestamp = Date.now();
  const suffix = randomBytes(4).toString('hex');
  const freshDatabase = createTemporaryDatabaseName('fresh', timestamp, suffix);
  const partialDatabase = createTemporaryDatabaseName('partial', timestamp, suffix);
  const databases = [freshDatabase, partialDatabase];
  const server = await mysql.createConnection(connectionOptions());
  let operationError = null;
  const cleanupErrors = [];

  try {
    for (const databaseName of databases) await createDatabase(server, databaseName);

    const freshMigrationOutput = await runDatabaseScript('scripts/db-migrate.mjs', freshDatabase);
    if (!freshMigrationOutput.includes('apply 005_feedback_and_research_analytics.sql')) {
      throw new Error('Fresh migration did not report applying migration 005');
    }
    await runDatabaseScript('scripts/db-check.mjs', freshDatabase);

    await runDatabaseScript('scripts/db-migrate.mjs', partialDatabase);
    await makeMigration005Partial(partialDatabase);
    const partialOutput = await runDatabaseScript(
      'scripts/db-migrate.mjs',
      partialDatabase,
      { expectFailure: true },
    );
    if (
      !partialOutput.includes('005_feedback_and_research_analytics.sql')
      || !partialOutput.includes('cannot continue from a partial schema')
    ) {
      throw new Error('Partial migration did not fail with the expected safety message');
    }
    await assertOnlyOneMigration005TableRemains(partialDatabase);
  } catch (error) {
    operationError = error;
  } finally {
    for (const databaseName of databases.reverse()) {
      try {
        await dropDatabase(server, databaseName);
      } catch (error) {
        cleanupErrors.push(`${databaseName}: ${error.message}`);
      }
    }
    await server.end();
  }

  if (cleanupErrors.length) {
    throw new Error(`Temporary E2E database cleanup failed: ${cleanupErrors.join('; ')}`);
  }
  if (operationError) throw operationError;

  console.log('Research migration E2E smoke passed: fresh install, partial guard, and cleanup.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Research migration E2E smoke failed:', error.message);
    process.exit(1);
  });
