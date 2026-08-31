import mysql from 'mysql2/promise';
import { assertE2eSafety } from './e2e-safety.mjs';

async function main() {
  const { databaseName } = assertE2eSafety();
  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error('DB_NAME may contain only letters, numbers, and underscores');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 4000),
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    connectTimeout: 10_000,
  });

  try {
    const [schemas] = await connection.query(
      'SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?',
      [databaseName],
    );
    const existed = schemas.length > 0;

    if (!existed) {
      await connection.query(
        `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
      );
    }

    const [tableRows] = await connection.query(
      'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?',
      [databaseName],
    );
    const tableCount = Number(tableRows[0].count);
    console.log(`${existed ? 'Found' : 'Created'} isolated database ${databaseName}; tables=${tableCount}.`);
    if (existed && tableCount > 0) {
      console.log('Existing data was left untouched; run the guarded preflight before migration.');
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('E2E database creation failed:', error.message);
  process.exit(1);
});
