import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import db from '../lib/db.js';
import {
  assertBaselineShape,
  assertMigration002Complete,
  inspectSchema,
} from './db-schema.mjs';
import { assertE2eFlag } from './e2e-safety.mjs';

const migrationsDirectory = path.join(process.cwd(), 'database', 'migrations');

function splitStatements(source) {
  return source
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  assertE2eFlag({ requireCredentials: true, requireWriteOptIn: true });
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(191) NOT NULL PRIMARY KEY,
      checksum CHAR(64) NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
  `);

  const [checksumColumns] = await db.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'schema_migrations' AND column_name = 'checksum'`,
  );
  if (checksumColumns.length === 0) {
    await db.query('ALTER TABLE schema_migrations ADD COLUMN checksum CHAR(64) NULL AFTER name');
  }

  const [appliedRows] = await db.query('SELECT name, checksum FROM schema_migrations');
  const applied = new Map(appliedRows.map((row) => [row.name, row.checksum]));
  const files = (await readdir(migrationsDirectory))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();

  for (const name of files) {
    const sql = await readFile(path.join(migrationsDirectory, name), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');

    if (applied.has(name)) {
      const recordedChecksum = applied.get(name);
      if (recordedChecksum && recordedChecksum !== checksum) {
        throw new Error(`${name} checksum mismatch; migration files must be immutable`);
      }

      const state = await inspectSchema(db);
      if (name.startsWith('001_')) assertBaselineShape(state);
      if (name.startsWith('002_')) assertMigration002Complete(state);
      if (!recordedChecksum) {
        await db.query('UPDATE schema_migrations SET checksum = ? WHERE name = ?', [checksum, name]);
        console.log(`adopt checksum ${name}`);
      } else {
        console.log(`skip ${name}`);
      }
      continue;
    }

    if (name.startsWith('001_')) {
      console.log(`apply baseline ${name}`);
      for (const statement of splitStatements(sql)) await db.query(statement);
      assertBaselineShape(await inspectSchema(db));
    } else if (name.startsWith('002_')) {
      const before = await inspectSchema(db);
      assertBaselineShape(before);
      if (before.migration002State === 'partial') {
        throw new Error(
          `${name} cannot continue from a partial schema (${before.found002.length}/${before.expected002Count} expected objects)`,
        );
      }
      if (before.migration002State === 'complete') {
        console.log(`adopt ${name}; expected indexes and foreign keys already exist`);
      } else {
        console.log(`apply ${name}`);
        for (const statement of splitStatements(sql)) await db.query(statement);
      }
      assertMigration002Complete(await inspectSchema(db));
    } else {
      console.log(`apply ${name}`);
      for (const statement of splitStatements(sql)) await db.query(statement);
    }
    await db.query('INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)', [name, checksum]);
  }

  console.log('Database migrations are up to date.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exit(1);
  });
