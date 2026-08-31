export const applicationTables = [
  'users', 'topics', 'comments', 'likes', 'bookmarks', 'notifications',
  'polls', 'poll_options', 'poll_votes', 'reports', 'rate_limits',
];

export const baselineColumns = {
  users: ['id', 'username', 'email', 'password', 'role', 'bio', 'avatar_url', 'post_count', 'is_banned', 'created_at', 'xp'],
  topics: ['id', 'title', 'category', 'content', 'image_url', 'user_id', 'views', 'created_at'],
  comments: ['id', 'topic_id', 'content', 'user_id', 'parent_id', 'created_at', 'is_solution'],
  likes: ['user_id', 'topic_id', 'created_at'],
  bookmarks: ['user_id', 'topic_id', 'created_at'],
  notifications: ['id', 'user_id', 'actor_id', 'topic_id', 'type', 'message', 'is_read', 'created_at'],
  polls: ['id', 'topic_id', 'question', 'created_at'],
  poll_options: ['id', 'poll_id', 'label', 'vote_count'],
  poll_votes: ['id', 'poll_id', 'user_id', 'option_id', 'created_at'],
  reports: ['id', 'reporter_id', 'topic_id', 'comment_id', 'reason', 'status', 'created_at'],
  rate_limits: ['rate_key', 'window_start', 'request_count', 'expires_at'],
};

export const migration002Indexes = [
  ['users', 'uq_users_username', 'U:username'],
  ['topics', 'idx_topics_user', 'N:user_id'],
  ['comments', 'idx_comments_topic', 'N:topic_id'],
  ['comments', 'idx_comments_user', 'N:user_id'],
  ['comments', 'idx_comments_parent', 'N:parent_id'],
  ['likes', 'idx_likes_topic', 'N:topic_id'],
  ['notifications', 'idx_notifications_user', 'N:user_id'],
  ['notifications', 'idx_notifications_actor', 'N:actor_id'],
  ['notifications', 'idx_notifications_topic', 'N:topic_id'],
  ['poll_votes', 'idx_poll_votes_poll', 'N:poll_id'],
  ['poll_votes', 'idx_poll_votes_option', 'N:option_id'],
];

export const migration002ForeignKeys = [
  ['topics', 'fk_topics_user', 'user_id->users.id:SET NULL'],
  ['comments', 'fk_comments_topic', 'topic_id->topics.id:CASCADE'],
  ['comments', 'fk_comments_user', 'user_id->users.id:SET NULL'],
  ['comments', 'fk_comments_parent', 'parent_id->comments.id:SET NULL'],
  ['likes', 'fk_likes_user', 'user_id->users.id:CASCADE'],
  ['likes', 'fk_likes_topic', 'topic_id->topics.id:CASCADE'],
  ['notifications', 'fk_notifications_user', 'user_id->users.id:CASCADE'],
  ['notifications', 'fk_notifications_actor', 'actor_id->users.id:CASCADE'],
  ['notifications', 'fk_notifications_topic', 'topic_id->topics.id:CASCADE'],
  ['polls', 'fk_polls_topic', 'topic_id->topics.id:CASCADE'],
  ['poll_options', 'fk_poll_options_poll', 'poll_id->polls.id:CASCADE'],
  ['poll_votes', 'fk_poll_votes_poll', 'poll_id->polls.id:CASCADE'],
  ['poll_votes', 'fk_poll_votes_user', 'user_id->users.id:CASCADE'],
  ['poll_votes', 'fk_poll_votes_option', 'option_id->poll_options.id:CASCADE'],
];

function value(row, upper, lower) {
  return row[upper] ?? row[lower];
}

export async function inspectSchema(db) {
  const [tableRows] = await db.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()',
  );
  const tables = new Set(tableRows.map((row) => value(row, 'TABLE_NAME', 'table_name')));

  const [columnRows] = await db.query(
    'SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = DATABASE()',
  );
  const columns = new Set(columnRows.map((row) => (
    `${value(row, 'TABLE_NAME', 'table_name')}.${value(row, 'COLUMN_NAME', 'column_name')}`
  )));

  const [indexRows] = await db.query(
    `SELECT table_name, index_name, non_unique, seq_in_index, column_name
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
     ORDER BY table_name, index_name, seq_in_index`,
  );
  const indexes = new Map();
  for (const row of indexRows) {
    const key = `${value(row, 'TABLE_NAME', 'table_name')}.${value(row, 'INDEX_NAME', 'index_name')}`;
    const entry = indexes.get(key) || {
      unique: Number(value(row, 'NON_UNIQUE', 'non_unique')) === 0,
      columns: [],
    };
    entry.columns.push(value(row, 'COLUMN_NAME', 'column_name'));
    indexes.set(key, entry);
  }

  const [constraintRows] = await db.query(
    `SELECT kcu.table_name, kcu.constraint_name, kcu.column_name,
            kcu.referenced_table_name, kcu.referenced_column_name,
            rc.delete_rule, kcu.ordinal_position
     FROM information_schema.key_column_usage kcu
     INNER JOIN information_schema.referential_constraints rc
       ON rc.constraint_schema = kcu.constraint_schema
      AND rc.constraint_name = kcu.constraint_name
      AND rc.table_name = kcu.table_name
     WHERE kcu.constraint_schema = DATABASE() AND kcu.referenced_table_name IS NOT NULL
     ORDER BY kcu.table_name, kcu.constraint_name, kcu.ordinal_position`,
  );
  const foreignKeys = new Map();
  for (const row of constraintRows) {
    const key = `${value(row, 'TABLE_NAME', 'table_name')}.${value(row, 'CONSTRAINT_NAME', 'constraint_name')}`;
    const entry = foreignKeys.get(key) || {
      columns: [],
      referencedTable: value(row, 'REFERENCED_TABLE_NAME', 'referenced_table_name'),
      referencedColumns: [],
      deleteRule: value(row, 'DELETE_RULE', 'delete_rule'),
    };
    entry.columns.push(value(row, 'COLUMN_NAME', 'column_name'));
    entry.referencedColumns.push(value(row, 'REFERENCED_COLUMN_NAME', 'referenced_column_name'));
    foreignKeys.set(key, entry);
  }

  const missingTables = applicationTables.filter((table) => !tables.has(table));
  const missingColumns = Object.entries(baselineColumns).flatMap(([table, names]) => (
    tables.has(table)
      ? names.filter((name) => !columns.has(`${table}.${name}`)).map((name) => `${table}.${name}`)
      : []
  ));
  const named002 = [
    ...migration002Indexes.filter(([table, name]) => indexes.has(`${table}.${name}`)).map(([, name]) => name),
    ...migration002ForeignKeys.filter(([table, name]) => foreignKeys.has(`${table}.${name}`)).map(([, name]) => name),
  ];
  const found002 = [
    ...migration002Indexes.filter(([table, name, signature]) => {
      const index = indexes.get(`${table}.${name}`);
      const actual = index ? `${index.unique ? 'U' : 'N'}:${index.columns.join(',')}` : '';
      return actual === signature;
    }).map(([, name]) => name),
    ...migration002ForeignKeys.filter(([table, name, signature]) => {
      const foreignKey = foreignKeys.get(`${table}.${name}`);
      const actual = foreignKey
        ? `${foreignKey.columns.join(',')}->${foreignKey.referencedTable}.${foreignKey.referencedColumns.join(',')}:${foreignKey.deleteRule}`
        : '';
      return actual === signature;
    }).map(([, name]) => name),
  ];
  const expected002Count = migration002Indexes.length + migration002ForeignKeys.length;
  const migration002State = named002.length === 0
    ? 'absent'
    : found002.length === expected002Count ? 'complete' : 'partial';

  return {
    tables,
    columns,
    indexes,
    foreignKeys,
    missingTables,
    missingColumns,
    migration002State,
    found002,
    named002,
    expected002Count,
  };
}

export function assertBaselineShape(state) {
  const failures = [];
  if (state.missingTables.length) failures.push(`missing tables: ${state.missingTables.join(', ')}`);
  if (state.missingColumns.length) failures.push(`missing columns: ${state.missingColumns.join(', ')}`);
  if (failures.length) throw new Error(failures.join('; '));
}

export function assertMigration002Complete(state) {
  if (state.migration002State !== 'complete') {
    throw new Error(
      `migration 002 schema is ${state.migration002State} (${state.found002.length}/${state.expected002Count} expected objects)`,
    );
  }
}

export const integrityChecks = {
  duplicate_usernames: 'SELECT COUNT(*) AS count FROM (SELECT username FROM users GROUP BY username HAVING COUNT(*) > 1) duplicates',
  orphan_topics: 'SELECT COUNT(*) AS count FROM topics t LEFT JOIN users u ON u.id = t.user_id WHERE t.user_id IS NOT NULL AND u.id IS NULL',
  orphan_comments: 'SELECT COUNT(*) AS count FROM comments c LEFT JOIN topics t ON t.id = c.topic_id LEFT JOIN users u ON u.id = c.user_id LEFT JOIN comments p ON p.id = c.parent_id WHERE t.id IS NULL OR (c.user_id IS NOT NULL AND u.id IS NULL) OR (c.parent_id IS NOT NULL AND p.id IS NULL)',
  orphan_likes: 'SELECT COUNT(*) AS count FROM likes l LEFT JOIN users u ON u.id = l.user_id LEFT JOIN topics t ON t.id = l.topic_id WHERE u.id IS NULL OR t.id IS NULL',
  orphan_bookmarks: 'SELECT COUNT(*) AS count FROM bookmarks b LEFT JOIN users u ON u.id = b.user_id LEFT JOIN topics t ON t.id = b.topic_id WHERE u.id IS NULL OR t.id IS NULL',
  orphan_notifications: 'SELECT COUNT(*) AS count FROM notifications n LEFT JOIN users u ON u.id = n.user_id LEFT JOIN users a ON a.id = n.actor_id LEFT JOIN topics t ON t.id = n.topic_id WHERE u.id IS NULL OR a.id IS NULL OR t.id IS NULL',
  orphan_poll_votes: 'SELECT COUNT(*) AS count FROM poll_votes v LEFT JOIN polls p ON p.id = v.poll_id LEFT JOIN users u ON u.id = v.user_id LEFT JOIN poll_options o ON o.id = v.option_id WHERE p.id IS NULL OR u.id IS NULL OR o.id IS NULL OR o.poll_id <> v.poll_id',
};

export async function runIntegrityChecks(db) {
  const failures = [];
  for (const [name, sql] of Object.entries(integrityChecks)) {
    const [rows] = await db.query(sql);
    const count = Number(rows[0].count);
    console.log(`${name}: ${count}`);
    if (count !== 0) failures.push(`${name}=${count}`);
  }
  return failures;
}
