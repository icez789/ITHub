import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import db from '../lib/db.js';

const migrationsDirectory = path.join(process.cwd(), 'database', 'migrations');

function splitStatements(source) {
  return source
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(191) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
  `);

  const [appliedRows] = await db.query('SELECT name FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => row.name));
  const files = (await readdir(migrationsDirectory))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();

  for (const name of files) {
    if (applied.has(name)) {
      console.log(`skip ${name}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDirectory, name), 'utf8');
    console.log(`apply ${name}`);
    for (const statement of splitStatements(sql)) {
      await db.query(statement);
    }
    await db.query('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
  }

  console.log('Database migrations are up to date.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exit(1);
  });
