import db from '../lib/db.js';
import { applicationTables, inspectSchema, runIntegrityChecks } from './db-schema.mjs';
import { assertE2eFlag } from './e2e-safety.mjs';

async function main() {
  assertE2eFlag({ requireCredentials: true, requireWriteOptIn: true });
  const state = await inspectSchema(db);
  const existingApplicationTables = applicationTables.filter((table) => state.tables.has(table));

  if (existingApplicationTables.length === 0) {
    console.log('Preflight passed: database schema is empty and safe to initialize.');
    return;
  }

  const failures = [];
  if (state.missingColumns.length) failures.push(`missing columns: ${state.missingColumns.join(', ')}`);
  if (state.migration002State === 'partial') {
    failures.push(`migration 002 is partial (${state.found002.length}/${state.expected002Count} expected objects)`);
  }

  const integrityTables = ['users', 'topics', 'comments', 'likes', 'bookmarks', 'notifications', 'polls', 'poll_options', 'poll_votes'];
  const canCheckIntegrity = integrityTables.every((table) => state.tables.has(table)) && state.missingColumns.length === 0;
  const integrityFailures = canCheckIntegrity
    ? await runIntegrityChecks(db)
    : [];
  failures.push(...integrityFailures);

  console.log(`Existing application tables: ${existingApplicationTables.length}/${applicationTables.length}`);
  console.log(`Migration 002 state: ${state.migration002State}`);
  if (state.missingTables.length) {
    console.log(`Baseline will create missing tables: ${state.missingTables.join(', ')}`);
  }

  if (failures.length) throw new Error(failures.join('; '));
  console.log('Database preflight passed.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Database preflight failed:', error.message);
    process.exit(1);
  });
