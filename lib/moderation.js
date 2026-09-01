import 'server-only';

import db from './db';

export async function deleteTopicCascade(topicId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [topics] = await connection.query('SELECT user_id FROM topics WHERE id = ? FOR UPDATE', [topicId]);
    if (!topics[0]) {
      await connection.rollback();
      return false;
    }

    const topicOwnerId = topics[0].user_id;
    const [foreignKeyRows] = await connection.query(
      'SELECT @@foreign_key_checks AS foreign_key_checks',
    );
    if (Number(foreignKeyRows[0]?.foreign_key_checks) !== 1) {
      throw new Error('Foreign key checks must be enabled before deleting a topic');
    }

    // Aggregate every XP/post deduction in one set-based update. The number of
    // database round-trips no longer grows with commenters or poll voters.
    await connection.query(
      `UPDATE users u
       INNER JOIN (
         SELECT user_id,
                SUM(xp_deduction) AS xp_deduction,
                SUM(post_deduction) AS post_deduction
         FROM (
           SELECT ? AS user_id, 10 AS xp_deduction, 1 AS post_deduction
           UNION ALL
           SELECT c.user_id,
                   COUNT(*) * 2 + SUM(CASE WHEN c.is_solution = 1 AND (? IS NULL OR c.user_id <> ?) THEN 20 ELSE 0 END),
                  0
           FROM comments c
           WHERE c.topic_id = ? AND c.user_id IS NOT NULL
           GROUP BY c.user_id
           UNION ALL
           SELECT pv.user_id, COUNT(*), 0
           FROM poll_votes pv
           INNER JOIN polls p ON p.id = pv.poll_id
           WHERE p.topic_id = ?
           GROUP BY pv.user_id
         ) reward_rows
         GROUP BY user_id
       ) rewards ON rewards.user_id = u.id
       SET u.xp = GREATEST(0, COALESCE(u.xp, 0) - rewards.xp_deduction),
           u.post_count = GREATEST(0, COALESCE(u.post_count, 0) - rewards.post_deduction)`,
      [topicOwnerId, topicOwnerId, topicOwnerId, topicId, topicId],
    );

    // Migration 002 defines the complete dependency graph with ON DELETE
    // CASCADE, so deleting the parent removes all dependent content atomically.
    const [result] = await connection.query('DELETE FROM topics WHERE id = ?', [topicId]);
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteCommentCascade(commentId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [comments] = await connection.query(
      `SELECT c.user_id, c.is_solution, t.user_id AS topic_owner_id
       FROM comments c
       INNER JOIN topics t ON t.id = c.topic_id
       WHERE c.id = ?
       FOR UPDATE`,
      [commentId],
    );
    const comment = comments[0];
    if (!comment) {
      await connection.rollback();
      return false;
    }
    await connection.query('UPDATE comments SET parent_id = NULL WHERE parent_id = ?', [commentId]);
    await connection.query('DELETE FROM reports WHERE comment_id = ?', [commentId]);
    const [result] = await connection.query('DELETE FROM comments WHERE id = ?', [commentId]);
    if (comment.user_id) {
      const solutionDeduction = comment.is_solution && comment.user_id !== comment.topic_owner_id ? 20 : 0;
      await connection.query(
        'UPDATE users SET xp = GREATEST(0, COALESCE(xp, 0) - ?) WHERE id = ?',
        [2 + solutionDeduction, comment.user_id],
      );
    }
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
