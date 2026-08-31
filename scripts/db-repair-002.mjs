import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import db from '../lib/db.js';
import {
  assertMigration002Complete,
  inspectSchema,
  runIntegrityChecks,
} from './db-schema.mjs';

const expectedPartialObjects = [
  'uq_users_username',
  'idx_topics_user',
  'idx_comments_topic',
  'idx_comments_user',
  'idx_comments_parent',
  'idx_likes_topic',
  'idx_notifications_user',
  'idx_notifications_actor',
  'idx_notifications_topic',
  'fk_topics_user',
  'fk_comments_topic',
  'fk_comments_user',
  'fk_comments_parent',
  'fk_likes_user',
  'fk_likes_topic',
  'fk_notifications_user',
  'fk_notifications_actor',
  'fk_notifications_topic',
].sort();

const remainingStatements = [
  'ALTER TABLE polls ADD CONSTRAINT fk_polls_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE',
  'ALTER TABLE poll_options ADD CONSTRAINT fk_poll_options_poll FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE',
  'ALTER TABLE poll_votes ADD KEY idx_poll_votes_poll (poll_id), ADD KEY idx_poll_votes_option (option_id), ADD CONSTRAINT fk_poll_votes_poll FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE, ADD CONSTRAINT fk_poll_votes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE, ADD CONSTRAINT fk_poll_votes_option FOREIGN KEY (option_id) REFERENCES poll_options (id) ON DELETE CASCADE',
];

function argument(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
  if (!value) throw new Error(`--${name}=... is required`);
  return value;
}

function assertExactList(actual, expected, label) {
  const left = [...actual].sort();
  if (JSON.stringify(left) !== JSON.stringify(expected)) {
    throw new Error(`${label} fingerprint mismatch: ${left.join(', ')}`);
  }
}

async function count(sql) {
  const [rows] = await db.query(sql);
  return Number(rows[0].count);
}

async function main() {
  if (!process.argv.includes('--production-repair-002')) {
    throw new Error('--production-repair-002 is required');
  }

  const databaseName = String(process.env.DB_NAME || '').trim();
  if (!databaseName || databaseName.toLowerCase().endsWith('_e2e')) {
    throw new Error('repair requires the explicitly configured non-E2E database');
  }

  const expectedDatabase = argument('expected-database');
  const backupReference = argument('backup-reference');
  const expectedPolls = Number(argument('expected-orphan-polls'));
  const expectedOptions = Number(argument('expected-orphan-options'));
  const expectedVotes = Number(argument('expected-orphan-votes'));
  if (databaseName !== expectedDatabase) {
    throw new Error(`DB_NAME mismatch: expected ${expectedDatabase}, got ${databaseName}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(backupReference)) {
    throw new Error('backup reference must be an ISO UTC timestamp');
  }

  const before = await inspectSchema(db);
  if (before.migration002State !== 'partial' || before.found002.length !== 18) {
    throw new Error(`expected migration 002 partial fingerprint 18/25, got ${before.found002.length}/${before.expected002Count}`);
  }
  assertExactList(before.found002, expectedPartialObjects, 'migration 002');
  assertExactList(before.named002, expectedPartialObjects, 'named migration 002 objects');

  const [migrationRows] = await db.query(
    'SELECT name FROM schema_migrations WHERE name = ?',
    ['002_harden_legacy_schema.sql'],
  );
  if (migrationRows.length !== 0) throw new Error('migration 002 is already recorded');

  const actual = {
    polls: await count('SELECT COUNT(*) AS count FROM polls p LEFT JOIN topics t ON t.id = p.topic_id WHERE t.id IS NULL'),
    options: await count('SELECT COUNT(*) AS count FROM poll_options o LEFT JOIN polls p ON p.id = o.poll_id LEFT JOIN topics t ON t.id = p.topic_id WHERE p.id IS NULL OR t.id IS NULL'),
    votes: await count('SELECT COUNT(*) AS count FROM poll_votes v LEFT JOIN polls p ON p.id = v.poll_id LEFT JOIN topics t ON t.id = p.topic_id LEFT JOIN users u ON u.id = v.user_id LEFT JOIN poll_options o ON o.id = v.option_id WHERE p.id IS NULL OR t.id IS NULL OR u.id IS NULL OR o.id IS NULL OR o.poll_id <> v.poll_id'),
  };
  if (actual.polls !== expectedPolls || actual.options !== expectedOptions || actual.votes !== expectedVotes) {
    throw new Error(`orphan counts changed: polls=${actual.polls}, options=${actual.options}, votes=${actual.votes}`);
  }

  console.log(`Verified backup reference ${backupReference}.`);
  console.log(`Verified exact partial schema and orphan counts: ${actual.polls}/${actual.options}/${actual.votes}.`);
  if (process.argv.includes('--dry-run')) {
    console.log('Dry run passed; no rows or schema objects were changed.');
    return;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE v FROM poll_votes v
      LEFT JOIN polls p ON p.id = v.poll_id
      LEFT JOIN topics t ON t.id = p.topic_id
      LEFT JOIN users u ON u.id = v.user_id
      LEFT JOIN poll_options o ON o.id = v.option_id
      WHERE p.id IS NULL OR t.id IS NULL OR u.id IS NULL OR o.id IS NULL OR o.poll_id <> v.poll_id`);
    await connection.query(`DELETE o FROM poll_options o
      LEFT JOIN polls p ON p.id = o.poll_id
      LEFT JOIN topics t ON t.id = p.topic_id
      WHERE p.id IS NULL OR t.id IS NULL`);
    await connection.query(`DELETE p FROM polls p
      LEFT JOIN topics t ON t.id = p.topic_id
      WHERE t.id IS NULL`);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  for (const statement of remainingStatements) await db.query(statement);
  const after = await inspectSchema(db);
  assertMigration002Complete(after);
  const integrityFailures = await runIntegrityChecks(db);
  if (integrityFailures.length) throw new Error(integrityFailures.join('; '));

  const migrationPath = path.join(process.cwd(), 'database', 'migrations', '002_harden_legacy_schema.sql');
  const checksum = createHash('sha256').update(await readFile(migrationPath, 'utf8')).digest('hex');
  await db.query(
    'INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)',
    ['002_harden_legacy_schema.sql', checksum],
  );
  console.log('Migration 002 repair completed and recorded.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration 002 repair failed:', error.message);
    process.exit(1);
  });
