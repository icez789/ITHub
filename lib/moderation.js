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
      'UPDATE users SET post_count = GREATEST(0, COALESCE(post_count, 0) - 1) WHERE id = ?',
      [topics[0].user_id],
    );
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
    await connection.query('UPDATE comments SET parent_id = NULL WHERE parent_id = ?', [commentId]);
    await connection.query('DELETE FROM reports WHERE comment_id = ?', [commentId]);
    const [result] = await connection.query('DELETE FROM comments WHERE id = ?', [commentId]);
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
