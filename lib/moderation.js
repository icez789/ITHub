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
    const [commentRewards] = await connection.query(
      `SELECT user_id, COUNT(*) AS comment_count,
              SUM(CASE WHEN is_solution = 1 AND user_id <> ? THEN 1 ELSE 0 END) AS solution_count
       FROM comments
       WHERE topic_id = ? AND user_id IS NOT NULL
       GROUP BY user_id
       FOR UPDATE`,
      [topicOwnerId, topicId],
    );
    const [voteRewards] = await connection.query(
      `SELECT pv.user_id, COUNT(*) AS vote_count
       FROM poll_votes pv
       INNER JOIN polls p ON p.id = pv.poll_id
       WHERE p.topic_id = ?
       GROUP BY pv.user_id
       FOR UPDATE`,
      [topicId],
    );

    await connection.query('DELETE FROM notifications WHERE topic_id = ?', [topicId]);
    await connection.query('DELETE FROM reports WHERE topic_id = ?', [topicId]);
    await connection.query('DELETE r FROM reports r INNER JOIN comments c ON r.comment_id = c.id WHERE c.topic_id = ?', [topicId]);
    await connection.query('DELETE FROM bookmarks WHERE topic_id = ?', [topicId]);
    await connection.query('DELETE FROM likes WHERE topic_id = ?', [topicId]);
    await connection.query('DELETE pv FROM poll_votes pv INNER JOIN polls p ON pv.poll_id = p.id WHERE p.topic_id = ?', [topicId]);
    await connection.query('DELETE po FROM poll_options po INNER JOIN polls p ON po.poll_id = p.id WHERE p.topic_id = ?', [topicId]);
    await connection.query('DELETE FROM polls WHERE topic_id = ?', [topicId]);
    await connection.query('DELETE FROM comments WHERE topic_id = ?', [topicId]);
    await connection.query('DELETE FROM topics WHERE id = ?', [topicId]);
    await connection.query(
      'UPDATE users SET post_count = GREATEST(0, COALESCE(post_count, 0) - 1), xp = GREATEST(0, COALESCE(xp, 0) - 10) WHERE id = ?',
      [topicOwnerId],
    );
    for (const reward of commentRewards) {
      const deduction = Number(reward.comment_count) * 2 + Number(reward.solution_count || 0) * 20;
      await connection.query('UPDATE users SET xp = GREATEST(0, COALESCE(xp, 0) - ?) WHERE id = ?', [deduction, reward.user_id]);
    }
    for (const reward of voteRewards) {
      await connection.query('UPDATE users SET xp = GREATEST(0, COALESCE(xp, 0) - ?) WHERE id = ?', [Number(reward.vote_count), reward.user_id]);
    }
    await connection.commit();
    return true;
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
