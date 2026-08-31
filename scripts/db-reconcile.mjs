import db from '../lib/db.js';
import { assertE2eFlag } from './e2e-safety.mjs';

const apply = process.argv.includes('--apply');

const expectedScoresSql = `
  SELECT u.id,
         COALESCE(t.topic_count, 0) AS expected_post_count,
         COALESCE(t.topic_xp, 0) + COALESCE(c.comment_xp, 0)
           + COALESCE(s.solution_xp, 0) + COALESCE(v.vote_xp, 0) AS expected_xp
  FROM users u
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS topic_count, COUNT(*) * 10 AS topic_xp
    FROM topics WHERE user_id IS NOT NULL GROUP BY user_id
  ) t ON t.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) * 2 AS comment_xp
    FROM comments WHERE user_id IS NOT NULL GROUP BY user_id
  ) c ON c.user_id = u.id
  LEFT JOIN (
    SELECT c.user_id, COUNT(*) * 20 AS solution_xp
    FROM comments c INNER JOIN topics t ON t.id = c.topic_id
    WHERE c.is_solution = 1 AND c.user_id IS NOT NULL AND c.user_id <> t.user_id
    GROUP BY c.user_id
  ) s ON s.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS vote_xp FROM poll_votes GROUP BY user_id
  ) v ON v.user_id = u.id
`;

async function main() {
  const e2e = assertE2eFlag({ requireCredentials: true, requireWriteOptIn: true });
  const [expectedRows] = await db.query(expectedScoresSql);
  const [currentRows] = await db.query('SELECT id, post_count, xp FROM users');
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const mismatches = expectedRows.filter((row) => {
    const current = currentById.get(row.id);
    return Number(current?.post_count || 0) !== Number(row.expected_post_count)
      || Number(current?.xp || 0) !== Number(row.expected_xp);
  });

  console.log(`Users with counter drift: ${mismatches.length}`);
  if (!apply) {
    console.log('Dry run only. Re-run with --apply after reviewing the count.');
    if (e2e && mismatches.length) {
      throw new Error(`E2E counter reconciliation found ${mismatches.length} unexplained mismatches`);
    }
    return;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const row of mismatches) {
      await connection.query(
        'UPDATE users SET post_count = ?, xp = ? WHERE id = ?',
        [Number(row.expected_post_count), Number(row.expected_xp), row.id],
      );
    }
    await connection.commit();
    console.log(`Reconciled ${mismatches.length} users.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Reconciliation failed:', error.message);
    process.exit(1);
  });
