import bcrypt from 'bcryptjs';
import db from '../lib/db.js';

async function main() {
  const email = String(process.env.ITHUB_SEED_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ITHUB_SEED_PASSWORD || '');
  const username = String(process.env.ITHUB_SEED_USERNAME || 'ITHub Bot 🤖').trim();

  if (!email || password.length < 12 || username.length < 3 || username.length > 50) {
    throw new Error('Set ITHUB_SEED_EMAIL, ITHUB_SEED_PASSWORD (12+ chars), and an optional ITHUB_SEED_USERNAME.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO users (username, email, password, role)
     VALUES (?, ?, ?, 'user')
     ON DUPLICATE KEY UPDATE username = VALUES(username), password = VALUES(password)`,
    [username, email, passwordHash],
  );
  console.log(`Seeded user ${username}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  });
