import db from '../lib/db.js';
import { inspectSchema } from './db-schema.mjs';
import { assertE2eSafety } from './e2e-safety.mjs';

async function main() {
  assertE2eSafety({ requireCredentials: true, requireWriteOptIn: true });
  const state = await inspectSchema(db);
  const expectedPartial = ['users.avatar_public_id', 'users.session_version'];
  const actual = [...state.found003].sort();
  if (state.migration003State !== 'partial' || JSON.stringify(actual) !== JSON.stringify(expectedPartial)) {
    throw new Error(`Refusing repair: expected only ${expectedPartial.join(', ')}, found ${actual.join(', ') || 'none'}`);
  }
  const [rows] = await db.query("SELECT COUNT(*) AS count FROM schema_migrations WHERE name LIKE '003_%'");
  if (Number(rows[0].count) !== 0) throw new Error('Refusing repair: migration 003 is already recorded');

  await db.query('ALTER TABLE users DROP COLUMN avatar_public_id, DROP COLUMN session_version');
  const repaired = await inspectSchema(db);
  if (repaired.migration003State !== 'absent') throw new Error('Repair did not restore migration 003 to absent state');
  console.log('Removed the two unrecorded migration 003 columns from the isolated _e2e database.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration 003 E2E repair failed:', error.message);
    process.exit(1);
  });
