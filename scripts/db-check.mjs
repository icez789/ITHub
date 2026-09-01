import db from '../lib/db.js';
import {
  applicationTables,
  assertBaselineShape,
  assertMigration002Complete,
  assertMigration003Complete,
  inspectSchema,
  runIntegrityChecks,
} from './db-schema.mjs';
import { assertE2eFlag } from './e2e-safety.mjs';

async function main() {
  assertE2eFlag({ requireCredentials: true, requireWriteOptIn: true });
  const state = await inspectSchema(db);
  const failures = [];

  try {
    assertBaselineShape(state);
    assertMigration002Complete(state);
    assertMigration003Complete(state);
  } catch (error) {
    failures.push(error.message);
  }
  if (!state.tables.has('schema_migrations')) failures.push('missing tables: schema_migrations');
  if (state.missingTables.length === 0 && state.missingColumns.length === 0) {
    failures.push(...await runIntegrityChecks(db));
  }

  console.log(`Required application tables: ${applicationTables.length - state.missingTables.length}/${applicationTables.length}`);

  if (failures.length) throw new Error(failures.join('; '));
  console.log('Database schema and referential integrity checks passed.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Database check failed:', error.message);
    process.exit(1);
  });
