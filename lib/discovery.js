import 'server-only';

import db from './db';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DISCOVERY_CATEGORIES,
  isDiscoveryCategory,
  recommendationReason,
} from './discoveryShared';
import { notificationChannelName } from './pusherChannels';
import { pusherServer } from './pusher';

const preferenceColumns = new Set(Object.keys(DEFAULT_NOTIFICATION_PREFERENCES));

function toPreferences(row) {
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  return Object.fromEntries(
    Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).map((key) => [key, Boolean(row[key])]),
  );
}

export async function getNotificationPreferences(userId, executor = db) {
  const [rows] = await executor.query(
    `SELECT comments_enabled, likes_enabled, solutions_enabled,
            followed_categories_enabled, followed_authors_enabled
     FROM notification_preferences WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return toPreferences(rows[0]);
}

export async function isNotificationEnabled(userId, key, executor = db) {
  if (!preferenceColumns.has(key)) throw new Error('Invalid notification preference');
  const [rows] = await executor.query(
    `SELECT ${key} AS enabled FROM notification_preferences WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] ? Boolean(rows[0].enabled) : DEFAULT_NOTIFICATION_PREFERENCES[key];
}

export async function getFollowState(userId, { category, authorId } = {}) {
  if (!userId) return { categoryFollowing: false, authorFollowing: false };
  const categoryQuery = isDiscoveryCategory(category)
    ? db.query('SELECT 1 FROM user_category_follows WHERE user_id = ? AND category = ? LIMIT 1', [userId, category])
    : Promise.resolve([[]]);
  const authorQuery = Number(authorId) > 0
    ? db.query('SELECT 1 FROM user_author_follows WHERE follower_id = ? AND author_id = ? LIMIT 1', [userId, Number(authorId)])
    : Promise.resolve([[]]);
  const [[[categoryRow]], [[authorRow]]] = await Promise.all([categoryQuery, authorQuery]);
  return { categoryFollowing: Boolean(categoryRow), authorFollowing: Boolean(authorRow) };
}

export async function setCategoryFollowRecord(userId, category, following) {
  if (following) {
    await db.query('INSERT IGNORE INTO user_category_follows (user_id, category) VALUES (?, ?)', [userId, category]);
  } else {
    await db.query('DELETE FROM user_category_follows WHERE user_id = ? AND category = ?', [userId, category]);
  }
}

export async function setAuthorFollowRecord(userId, authorId, following) {
  if (!following) {
    await db.query('DELETE FROM user_author_follows WHERE follower_id = ? AND author_id = ?', [userId, authorId]);
    return { status: 'changed' };
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [lockedUsers] = await connection.query(
      'SELECT id, is_banned FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE',
      [userId, authorId],
    );
    const author = lockedUsers.find((row) => Number(row.id) === Number(authorId));
    if (!author || author.is_banned) {
      await connection.rollback();
      return { status: 'unavailable' };
    }
    if (following) {
      const [[countRow]] = await connection.query(
        'SELECT COUNT(*) AS count FROM user_author_follows WHERE follower_id = ?',
        [userId],
      );
      const [existing] = await connection.query(
        'SELECT 1 FROM user_author_follows WHERE follower_id = ? AND author_id = ? LIMIT 1',
        [userId, authorId],
      );
      if (!existing[0] && Number(countRow.count) >= 200) {
        await connection.rollback();
        return { status: 'limit' };
      }
      await connection.query(
        'INSERT IGNORE INTO user_author_follows (follower_id, author_id) VALUES (?, ?)',
        [userId, authorId],
      );
    } else {
      await connection.query(
        'DELETE FROM user_author_follows WHERE follower_id = ? AND author_id = ?',
        [userId, authorId],
      );
    }
    await connection.commit();
    return { status: 'changed' };
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

export async function saveNotificationPreferences(userId, preferences) {
  await db.query(
    `INSERT INTO notification_preferences
       (user_id, comments_enabled, likes_enabled, solutions_enabled,
        followed_categories_enabled, followed_authors_enabled)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       comments_enabled = VALUES(comments_enabled),
       likes_enabled = VALUES(likes_enabled),
       solutions_enabled = VALUES(solutions_enabled),
       followed_categories_enabled = VALUES(followed_categories_enabled),
       followed_authors_enabled = VALUES(followed_authors_enabled)`,
    [
      userId,
      preferences.comments_enabled,
      preferences.likes_enabled,
      preferences.solutions_enabled,
      preferences.followed_categories_enabled,
      preferences.followed_authors_enabled,
    ],
  );
}

function buildFeedWhere({ personalized, search, category }) {
  const conditions = [];
  const params = [];
  if (personalized) conditions.push('(ucf.user_id IS NOT NULL OR uaf.follower_id IS NOT NULL)');
  if (search) {
    conditions.push('(INSTR(topics.title, ?) > 0 OR INSTR(COALESCE(topics.content, \'\'), ?) > 0)');
    params.push(search, search);
  }
  if (category) {
    conditions.push('topics.category = ?');
    params.push(category);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export async function getTopicFeed({
  feed = 'community',
  userId = null,
  search = '',
  category = '',
  sort = 'latest',
  page = 1,
  pageSize = 9,
}) {
  const personalized = (feed === 'following' || feed === 'for-you') && Boolean(userId);
  const joins = personalized
    ? `LEFT JOIN user_category_follows ucf ON ucf.user_id = ? AND ucf.category = topics.category
       LEFT JOIN user_author_follows uaf ON uaf.follower_id = ? AND uaf.author_id = topics.user_id`
    : '';
  const joinParams = personalized ? [userId, userId] : [];
  const { where, params } = buildFeedWhere({ personalized, search, category });
  let orderBy = search
    ? 'topics.created_at DESC, topics.id DESC'
    : 'topics.is_pinned DESC, topics.created_at DESC, topics.id DESC';
  if (sort === 'popular') orderBy = 'topics.views DESC, topics.created_at DESC, topics.id DESC';
  if (sort === 'likes') orderBy = 'like_count DESC, topics.created_at DESC, topics.id DESC';
  if (feed === 'for-you' && personalized) {
    orderBy = 'recommendation_score DESC, topics.created_at DESC, topics.id DESC';
  }

  const flags = personalized
    ? `IF(uaf.author_id IS NULL, 0, 1) AS follows_author,
       IF(ucf.category IS NULL, 0, 1) AS follows_category,`
    : '0 AS follows_author, 0 AS follows_category,';
  const score = personalized
    ? `(IF(uaf.author_id IS NULL, 0, 60) + IF(ucf.category IS NULL, 0, 40)
       + GREATEST(0, 30 - GREATEST(0, TIMESTAMPDIFF(DAY, topics.created_at, NOW())))
       + LEAST(10, COALESCE(l.like_count, 0) * 2 + COALESCE(c.comment_count, 0)
         + LEAST(3, FLOOR(LOG2(GREATEST(0, topics.views) + 1)))))`
    : '0';
  const baseJoins = `
    FROM topics
    LEFT JOIN users ON topics.user_id = users.id
    LEFT JOIN (SELECT topic_id, COUNT(*) AS comment_count FROM comments GROUP BY topic_id) c ON c.topic_id = topics.id
    LEFT JOIN (SELECT topic_id, COUNT(*) AS like_count FROM likes GROUP BY topic_id) l ON l.topic_id = topics.id
    ${joins}`;
  const queryParams = [...joinParams, ...params];
  const offset = (page - 1) * pageSize;
  const [[[countRow]], [rows]] = await Promise.all([
    db.query(`SELECT COUNT(*) AS total ${baseJoins} ${where}`, queryParams),
    db.query(
      `SELECT topics.id, topics.title, topics.category, topics.content, topics.image_url,
              topics.views, topics.is_pinned, topics.is_locked, topics.created_at,
              topics.user_id, users.username,
              COALESCE(c.comment_count, 0) AS comment_count,
              COALESCE(l.like_count, 0) AS like_count,
              ${flags}
              ${score} AS recommendation_score
       ${baseJoins}
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset],
    ),
  ]);
  return {
    total: Number(countRow.total),
    topics: rows.map((row) => ({
      ...row,
      recommendation_reason: recommendationReason(Boolean(row.follows_author), Boolean(row.follows_category)),
    })),
  };
}

export async function getTrendingTopics({ excludeIds = [], userId = null, limit = 3 } = {}) {
  const safeIds = excludeIds.map(Number).filter((id) => Number.isInteger(id) && id > 0).slice(0, 20);
  const conditions = [];
  const params = [];
  if (safeIds.length) {
    conditions.push(`topics.id NOT IN (${safeIds.map(() => '?').join(',')})`);
    params.push(...safeIds);
  }
  if (userId) {
    conditions.push(`NOT EXISTS (SELECT 1 FROM user_category_follows cf WHERE cf.user_id = ? AND cf.category = topics.category)`);
    conditions.push(`NOT EXISTS (SELECT 1 FROM user_author_follows af WHERE af.follower_id = ? AND af.author_id = topics.user_id)`);
    params.push(userId, userId);
  }
  const exclusion = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT topics.id, topics.title, topics.category, topics.content, topics.image_url,
            topics.views, topics.is_pinned, topics.is_locked, topics.created_at,
            topics.user_id, users.username,
            COALESCE(c.comment_count, 0) AS comment_count,
            COALESCE(l.like_count, 0) AS like_count
     FROM topics
     LEFT JOIN users ON users.id = topics.user_id
     LEFT JOIN (SELECT topic_id, COUNT(*) AS comment_count FROM comments GROUP BY topic_id) c ON c.topic_id = topics.id
     LEFT JOIN (SELECT topic_id, COUNT(*) AS like_count FROM likes GROUP BY topic_id) l ON l.topic_id = topics.id
     ${exclusion}
     ORDER BY (COALESCE(l.like_count, 0) * 3 + COALESCE(c.comment_count, 0) * 2 + LEAST(topics.views, 50)) DESC,
              topics.created_at DESC, topics.id DESC
     LIMIT ?`,
    [...params, Math.max(1, Math.min(3, Number(limit) || 3))],
  );
  return rows;
}

export async function getFollowingOverview(userId, { page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const [[categories], [authors], [[countRow]]] = await Promise.all([
    db.query('SELECT category FROM user_category_follows WHERE user_id = ? ORDER BY category ASC', [userId]),
    db.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM user_author_follows f INNER JOIN users u ON u.id = f.author_id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC, u.id DESC LIMIT ? OFFSET ?`,
      [userId, pageSize, offset],
    ),
    db.query(
      `SELECT COUNT(*) AS total FROM user_author_follows f
       INNER JOIN users u ON u.id = f.author_id
       WHERE f.follower_id = ?`,
      [userId],
    ),
  ]);
  const followedCategories = new Set(categories.map((row) => row.category));
  return {
    categories: DISCOVERY_CATEGORIES.map((category) => ({
      category,
      following: followedCategories.has(category),
    })),
    authors,
    totalAuthors: Number(countRow.total),
  };
}

export async function getFollowCounts(userId) {
  const [[row]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM user_category_follows WHERE user_id = ?) AS category_count,
       (SELECT COUNT(*) FROM user_author_follows WHERE follower_id = ?) AS author_count`,
    [userId, userId],
  );
  return {
    categories: Number(row.category_count),
    authors: Number(row.author_count),
    total: Number(row.category_count) + Number(row.author_count),
  };
}

export async function deliverFollowTopicNotifications({ topicId, actorId, actorUsername, category }) {
  const [recipients] = await db.query(
    `SELECT DISTINCT recipient_id FROM (
       SELECT cf.user_id AS recipient_id
       FROM user_category_follows cf
       INNER JOIN users u ON u.id = cf.user_id AND u.is_banned = 0
       LEFT JOIN notification_preferences p ON p.user_id = cf.user_id
       WHERE cf.category = ? AND cf.user_id <> ?
         AND COALESCE(p.followed_categories_enabled, 0) = 1
       UNION
       SELECT af.follower_id AS recipient_id
       FROM user_author_follows af
       INNER JOIN users u ON u.id = af.follower_id AND u.is_banned = 0
       LEFT JOIN notification_preferences p ON p.user_id = af.follower_id
       WHERE af.author_id = ? AND af.follower_id <> ?
         AND COALESCE(p.followed_authors_enabled, 0) = 1
     ) recipients`,
    [category, actorId, actorId, actorId],
  );
  if (!recipients.length) return { delivered: 0 };
  const message = `${actorUsername} สร้างกระทู้ใหม่ที่คุณติดตาม`;
  const rows = recipients.map((recipient) => [recipient.recipient_id, actorId, topicId, 'follow_topic', message]);
  await db.query(
    'INSERT INTO notifications (user_id, actor_id, topic_id, type, message) VALUES ?',
    [rows],
  );
  const [insertedNotifications] = await db.query(
    `SELECT id, user_id FROM notifications
     WHERE actor_id = ? AND topic_id = ? AND type = 'follow_topic'`,
    [actorId, topicId],
  );
  const notificationIds = new Map(
    insertedNotifications.map((notification) => [Number(notification.user_id), notification.id]),
  );
  await Promise.allSettled(recipients.map((recipient) => pusherServer.trigger(
    notificationChannelName(recipient.recipient_id),
    'new-notification',
    {
      id: notificationIds.get(Number(recipient.recipient_id)),
      message,
      link: `/topic/${topicId}`,
      topic_id: topicId,
      type: 'follow_topic',
      created_at: new Date().toISOString(),
    },
  )));
  return { delivered: recipients.length };
}
