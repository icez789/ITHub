import db from '../lib/db.js';

const requiredTables = [
  'users', 'topics', 'comments', 'likes', 'bookmarks', 'notifications',
  'polls', 'poll_options', 'poll_votes', 'reports', 'rate_limits', 'schema_migrations',
];

const integrityChecks = {
  duplicate_usernames: 'SELECT COUNT(*) AS count FROM (SELECT username FROM users GROUP BY username HAVING COUNT(*) > 1) duplicates',
  orphan_topics: 'SELECT COUNT(*) AS count FROM topics t LEFT JOIN users u ON u.id = t.user_id WHERE t.user_id IS NOT NULL AND u.id IS NULL',
  orphan_comments: 'SELECT COUNT(*) AS count FROM comments c LEFT JOIN topics t ON t.id = c.topic_id LEFT JOIN users u ON u.id = c.user_id LEFT JOIN comments p ON p.id = c.parent_id WHERE t.id IS NULL OR (c.user_id IS NOT NULL AND u.id IS NULL) OR (c.parent_id IS NOT NULL AND p.id IS NULL)',
  orphan_likes: 'SELECT COUNT(*) AS count FROM likes l LEFT JOIN users u ON u.id = l.user_id LEFT JOIN topics t ON t.id = l.topic_id WHERE u.id IS NULL OR t.id IS NULL',
  orphan_bookmarks: 'SELECT COUNT(*) AS count FROM bookmarks b LEFT JOIN users u ON u.id = b.user_id LEFT JOIN topics t ON t.id = b.topic_id WHERE u.id IS NULL OR t.id IS NULL',
  orphan_notifications: 'SELECT COUNT(*) AS count FROM notifications n LEFT JOIN users u ON u.id = n.user_id LEFT JOIN users a ON a.id = n.actor_id LEFT JOIN topics t ON t.id = n.topic_id WHERE u.id IS NULL OR a.id IS NULL OR t.id IS NULL',
  orphan_poll_votes: 'SELECT COUNT(*) AS count FROM poll_votes v LEFT JOIN polls p ON p.id = v.poll_id LEFT JOIN users u ON u.id = v.user_id LEFT JOIN poll_options o ON o.id = v.option_id WHERE p.id IS NULL OR u.id IS NULL OR o.id IS NULL',
};

async function main() {
  const [tableRows] = await db.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()',
  );
  const tables = new Set(tableRows.map((row) => row.TABLE_NAME || row.table_name));
  const missingTables = requiredTables.filter((name) => !tables.has(name));
  const failures = [];

  if (missingTables.length) failures.push(`missing tables: ${missingTables.join(', ')}`);

  for (const [name, sql] of Object.entries(integrityChecks)) {
    if (missingTables.length) break;
    const [rows] = await db.query(sql);
    const count = Number(rows[0].count);
    console.log(`${name}: ${count}`);
    if (count !== 0) failures.push(`${name}=${count}`);
  }

  if (failures.length) throw new Error(failures.join('; '));
  console.log('Database schema and referential integrity checks passed.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Database check failed:', error.message);
    process.exit(1);
  });
