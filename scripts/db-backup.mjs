import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

// Backups contain private data and must stay in the ignored deployment directory.
async function main() {
  const outputDirectory = path.resolve('.vercel/backups');
  const database = process.env.DB_NAME;
  if (!database || database === '[SENSITIVE]') throw new Error('A configured database is required');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    port: process.env.DB_PORT || 4000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true,
  });
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.beginTransaction();
    const [tables] = await connection.query(
      "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
    );
    const chunks = ['SET NAMES utf8mb4;', 'SET FOREIGN_KEY_CHECKS = 0;'];
    const counts = {};
    for (const { name } of tables) {
      const identifier = mysql.escapeId(name);
      const [[definition]] = await connection.query(`SHOW CREATE TABLE ${identifier}`);
      chunks.push(`${definition['Create Table']};`);
      const [rows, fields] = await connection.query(`SELECT * FROM ${identifier}`);
      counts[name] = rows.length;
      const columns = fields.map((field) => mysql.escapeId(field.name)).join(', ');
      for (const row of rows) {
        const values = fields.map((field) => mysql.escape(row[field.name])).join(', ');
        chunks.push(`INSERT INTO ${identifier} (${columns}) VALUES (${values});`);
      }
    }
    await connection.commit();
    chunks.push('SET FOREIGN_KEY_CHECKS = 1;', '');
    const sql = chunks.join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(outputDirectory, `phase2-${timestamp}.sql`);
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(backupPath, sql, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    const manifest = {
      database,
      capturedAt: new Date().toISOString(),
      tables: counts,
      sha256: createHash('sha256').update(sql).digest('hex'),
      bytes: Buffer.byteLength(sql),
    };
    await writeFile(`${backupPath}.manifest.json`, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ backupPath, ...manifest }));
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(() => {
  console.error('Backup failed; no migration may proceed until a complete backup is verified.');
  process.exitCode = 1;
});
