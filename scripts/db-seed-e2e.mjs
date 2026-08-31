import bcrypt from 'bcryptjs';
import db from '../lib/db.js';
import { assertE2eSafety } from './e2e-safety.mjs';

const BASELINE_TOPIC_TITLE = 'ITHub E2E Baseline Topic';
const BASELINE_TOPIC_CONTENT = '<p>เนื้อหาสำหรับทดสอบการค้นหาแบบ E2E: literal_percent_%_underscore_ และ content-only-needle</p>';

async function main() {
  assertE2eSafety();
  const email = String(process.env.ITHUB_E2E_EMAIL).trim().toLowerCase();
  const password = String(process.env.ITHUB_E2E_PASSWORD);
  const username = String(process.env.ITHUB_E2E_USERNAME || 'ithub_e2e_member').trim();

  if (password.length < 12 || username.length < 3 || username.length > 50) {
    throw new Error('E2E password must be 12+ characters and username must be 3-50 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO users (username, email, password, role)
     VALUES (?, ?, ?, 'user')
     ON DUPLICATE KEY UPDATE username = VALUES(username), password = VALUES(password), role = 'user', is_banned = 0`,
    [username, email, passwordHash],
  );
  const [[user]] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  await db.query(
    `INSERT INTO topics (title, category, content, user_id)
     SELECT ?, 'General', ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM topics WHERE title = ? AND user_id = ?)`,
    [BASELINE_TOPIC_TITLE, BASELINE_TOPIC_CONTENT, user.id, BASELINE_TOPIC_TITLE, user.id],
  );

  console.log('Seeded deterministic E2E member and baseline topic.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('E2E seed failed:', error.message);
    process.exit(1);
  });
