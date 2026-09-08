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

export const migration003Tables = [
  'moderation_audit_logs',
  'media_cleanup_queue',
];

export const migration003Columns = [
  'users.session_version',
  'users.avatar_public_id',
  'topics.image_public_id',
  'topics.is_pinned',
  'topics.pinned_by',
  'topics.pinned_at',
  'topics.is_locked',
  'topics.locked_by',
  'topics.locked_at',
];

export const migration003Indexes = [
  ['topics', 'idx_topics_pinned_created', 'N:is_pinned,created_at'],
  ['topics', 'idx_topics_pinned_by', 'N:pinned_by'],
  ['topics', 'idx_topics_locked_by', 'N:locked_by'],
  ['moderation_audit_logs', 'idx_moderation_audit_created', 'N:created_at'],
  ['moderation_audit_logs', 'idx_moderation_audit_actor', 'N:actor_id'],
  ['moderation_audit_logs', 'idx_moderation_audit_target', 'N:target_type,target_id'],
  ['media_cleanup_queue', 'uq_media_cleanup_asset', 'U:public_id,resource_type'],
  ['media_cleanup_queue', 'idx_media_cleanup_status', 'N:status,created_at'],
];

export const migration003ForeignKeys = [
  ['topics', 'fk_topics_pinned_by', 'pinned_by->users.id:SET NULL'],
  ['topics', 'fk_topics_locked_by', 'locked_by->users.id:SET NULL'],
  ['moderation_audit_logs', 'fk_moderation_audit_actor', 'actor_id->users.id:SET NULL'],
];

export const migration004Tables = [
  'user_category_follows',
  'user_author_follows',
  'notification_preferences',
];

export const migration004Columns = [
  'user_category_follows.user_id',
  'user_category_follows.category',
  'user_category_follows.created_at',
  'user_author_follows.follower_id',
  'user_author_follows.author_id',
  'user_author_follows.created_at',
  'notification_preferences.user_id',
  'notification_preferences.comments_enabled',
  'notification_preferences.likes_enabled',
  'notification_preferences.solutions_enabled',
  'notification_preferences.followed_categories_enabled',
  'notification_preferences.followed_authors_enabled',
  'notification_preferences.updated_at',
];

export const migration004Indexes = [
  ['user_category_follows', 'PRIMARY', 'U:user_id,category'],
  ['user_category_follows', 'idx_category_follows_category', 'N:category,user_id'],
  ['user_author_follows', 'PRIMARY', 'U:follower_id,author_id'],
  ['user_author_follows', 'idx_author_follows_author', 'N:author_id,follower_id'],
  ['notification_preferences', 'PRIMARY', 'U:user_id'],
];

export const migration004ForeignKeys = [
  ['user_category_follows', 'fk_category_follows_user', 'user_id->users.id:CASCADE'],
  ['user_author_follows', 'fk_author_follows_follower', 'follower_id->users.id:CASCADE'],
  ['user_author_follows', 'fk_author_follows_author', 'author_id->users.id:CASCADE'],
  ['notification_preferences', 'fk_notification_preferences_user', 'user_id->users.id:CASCADE'],
];

export const migration005Tables = [
  'evaluation_campaigns',
  'analytics_consents',
  'analytics_events',
  'evaluation_responses',
  'feedback_submissions',
];

export const migration005Columns = [
  'evaluation_campaigns.id',
  'evaluation_campaigns.slug',
  'evaluation_campaigns.name',
  'evaluation_campaigns.status',
  'evaluation_campaigns.data_scope',
  'evaluation_campaigns.questionnaire_version',
  'evaluation_campaigns.consent_notice_version',
  'evaluation_campaigns.eligible_member_count',
  'evaluation_campaigns.starts_at',
  'evaluation_campaigns.ends_at',
  'evaluation_campaigns.retention_until',
  'evaluation_campaigns.opened_at',
  'evaluation_campaigns.closed_at',
  'evaluation_campaigns.locked_at',
  'evaluation_campaigns.created_by',
  'evaluation_campaigns.updated_by',
  'evaluation_campaigns.created_at',
  'evaluation_campaigns.updated_at',
  'analytics_consents.user_id',
  'analytics_consents.subject_key',
  'analytics_consents.key_version',
  'analytics_consents.notice_version',
  'analytics_consents.status',
  'analytics_consents.consented_at',
  'analytics_consents.withdrawn_at',
  'analytics_consents.created_at',
  'analytics_consents.updated_at',
  'analytics_events.id',
  'analytics_events.event_id',
  'analytics_events.subject_key',
  'analytics_events.session_key',
  'analytics_events.campaign_id',
  'analytics_events.data_scope',
  'analytics_events.event_name',
  'analytics_events.event_version',
  'analytics_events.outcome',
  'analytics_events.failure_code',
  'analytics_events.route_path',
  'analytics_events.properties',
  'analytics_events.occurred_at',
  'analytics_events.received_at',
  'evaluation_responses.id',
  'evaluation_responses.campaign_id',
  'evaluation_responses.user_id',
  'evaluation_responses.client_submission_id',
  'evaluation_responses.response_status',
  'evaluation_responses.respondent_type',
  'evaluation_responses.experience_level',
  'evaluation_responses.primary_device',
  'evaluation_responses.sus_answers',
  'evaluation_responses.sus_score',
  'evaluation_responses.task_results',
  'evaluation_responses.open_feedback',
  'evaluation_responses.submitted_at',
  'evaluation_responses.withdrawn_at',
  'evaluation_responses.updated_at',
  'feedback_submissions.id',
  'feedback_submissions.user_id',
  'feedback_submissions.campaign_id',
  'feedback_submissions.client_submission_id',
  'feedback_submissions.data_scope',
  'feedback_submissions.category',
  'feedback_submissions.rating',
  'feedback_submissions.details',
  'feedback_submissions.route_path',
  'feedback_submissions.status',
  'feedback_submissions.priority',
  'feedback_submissions.issue_theme',
  'feedback_submissions.internal_note',
  'feedback_submissions.updated_by',
  'feedback_submissions.resolved_at',
  'feedback_submissions.retention_until',
  'feedback_submissions.created_at',
  'feedback_submissions.updated_at',
];

export const migration005Indexes = [
  ['evaluation_campaigns', 'PRIMARY', 'U:id'],
  ['evaluation_campaigns', 'uq_evaluation_campaigns_slug', 'U:slug'],
  ['evaluation_campaigns', 'idx_evaluation_campaigns_status_scope', 'N:status,data_scope,starts_at,ends_at'],
  ['evaluation_campaigns', 'idx_evaluation_campaigns_retention', 'N:retention_until'],
  ['evaluation_campaigns', 'idx_evaluation_campaigns_created_by', 'N:created_by'],
  ['evaluation_campaigns', 'idx_evaluation_campaigns_updated_by', 'N:updated_by'],
  ['analytics_consents', 'PRIMARY', 'U:user_id'],
  ['analytics_consents', 'uq_analytics_consents_subject', 'U:subject_key'],
  ['analytics_consents', 'idx_analytics_consents_status_updated', 'N:status,updated_at'],
  ['analytics_events', 'PRIMARY', 'U:id'],
  ['analytics_events', 'uq_analytics_events_subject_event', 'U:subject_key,event_id'],
  ['analytics_events', 'idx_analytics_events_campaign_name_time', 'N:campaign_id,event_name,occurred_at'],
  ['analytics_events', 'idx_analytics_events_name_time', 'N:event_name,occurred_at'],
  ['analytics_events', 'idx_analytics_events_subject_session_time', 'N:subject_key,session_key,occurred_at'],
  ['analytics_events', 'idx_analytics_events_retention', 'N:received_at'],
  ['evaluation_responses', 'PRIMARY', 'U:id'],
  ['evaluation_responses', 'uq_evaluation_responses_campaign_user', 'U:campaign_id,user_id'],
  ['evaluation_responses', 'uq_evaluation_responses_user_submission', 'U:user_id,client_submission_id'],
  ['evaluation_responses', 'idx_evaluation_responses_campaign_status_time', 'N:campaign_id,response_status,submitted_at'],
  ['evaluation_responses', 'idx_evaluation_responses_campaign_demographics', 'N:campaign_id,respondent_type,experience_level,primary_device'],
  ['evaluation_responses', 'idx_evaluation_responses_user_time', 'N:user_id,submitted_at'],
  ['feedback_submissions', 'PRIMARY', 'U:id'],
  ['feedback_submissions', 'uq_feedback_submissions_user_submission', 'U:user_id,client_submission_id'],
  ['feedback_submissions', 'idx_feedback_submissions_user_time', 'N:user_id,created_at'],
  ['feedback_submissions', 'idx_feedback_submissions_campaign_status_priority', 'N:campaign_id,status,priority,created_at'],
  ['feedback_submissions', 'idx_feedback_submissions_theme_time', 'N:issue_theme,created_at'],
  ['feedback_submissions', 'idx_feedback_submissions_retention', 'N:retention_until'],
  ['feedback_submissions', 'idx_feedback_submissions_updated_by', 'N:updated_by'],
];

export const migration005ForeignKeys = [
  ['evaluation_campaigns', 'fk_evaluation_campaigns_created_by', 'created_by->users.id:SET NULL'],
  ['evaluation_campaigns', 'fk_evaluation_campaigns_updated_by', 'updated_by->users.id:SET NULL'],
  ['analytics_consents', 'fk_analytics_consents_user', 'user_id->users.id:CASCADE'],
  ['analytics_events', 'fk_analytics_events_subject', 'subject_key->analytics_consents.subject_key:CASCADE'],
  ['analytics_events', 'fk_analytics_events_campaign', 'campaign_id->evaluation_campaigns.id:CASCADE'],
  ['evaluation_responses', 'fk_evaluation_responses_campaign', 'campaign_id->evaluation_campaigns.id:CASCADE'],
  ['evaluation_responses', 'fk_evaluation_responses_user', 'user_id->users.id:CASCADE'],
  ['feedback_submissions', 'fk_feedback_submissions_user', 'user_id->users.id:CASCADE'],
  ['feedback_submissions', 'fk_feedback_submissions_campaign', 'campaign_id->evaluation_campaigns.id:CASCADE'],
  ['feedback_submissions', 'fk_feedback_submissions_updated_by', 'updated_by->users.id:SET NULL'],
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

  const found003 = [
    ...migration003Tables.filter((table) => tables.has(table)),
    ...migration003Columns.filter((column) => columns.has(column)),
    ...migration003Indexes.filter(([table, name, signature]) => {
      const index = indexes.get(`${table}.${name}`);
      const actual = index ? `${index.unique ? 'U' : 'N'}:${index.columns.join(',')}` : '';
      return actual === signature;
    }).map(([, name]) => name),
    ...migration003ForeignKeys.filter(([table, name, signature]) => {
      const foreignKey = foreignKeys.get(`${table}.${name}`);
      const actual = foreignKey
        ? `${foreignKey.columns.join(',')}->${foreignKey.referencedTable}.${foreignKey.referencedColumns.join(',')}:${foreignKey.deleteRule}`
        : '';
      return actual === signature;
    }).map(([, name]) => name),
  ];
  const expected003Count = migration003Tables.length + migration003Columns.length
    + migration003Indexes.length + migration003ForeignKeys.length;
  const migration003State = found003.length === 0
    ? 'absent'
    : found003.length === expected003Count ? 'complete' : 'partial';

  const found004 = [
    ...migration004Tables.filter((table) => tables.has(table)),
    ...migration004Columns.filter((column) => columns.has(column)),
    ...migration004Indexes.filter(([table, name, signature]) => {
      const index = indexes.get(`${table}.${name}`);
      const actual = index ? `${index.unique ? 'U' : 'N'}:${index.columns.join(',')}` : '';
      return actual === signature;
    }).map(([, name]) => name),
    ...migration004ForeignKeys.filter(([table, name, signature]) => {
      const foreignKey = foreignKeys.get(`${table}.${name}`);
      const actual = foreignKey
        ? `${foreignKey.columns.join(',')}->${foreignKey.referencedTable}.${foreignKey.referencedColumns.join(',')}:${foreignKey.deleteRule}`
        : '';
      return actual === signature;
    }).map(([, name]) => name),
  ];
  const expected004Count = migration004Tables.length + migration004Columns.length
    + migration004Indexes.length + migration004ForeignKeys.length;
  const migration004State = found004.length === 0
    ? 'absent'
    : found004.length === expected004Count ? 'complete' : 'partial';

  const found005 = [
    ...migration005Tables.filter((table) => tables.has(table)),
    ...migration005Columns.filter((column) => columns.has(column)),
    ...migration005Indexes.filter(([table, name, signature]) => {
      const index = indexes.get(`${table}.${name}`);
      const actual = index ? `${index.unique ? 'U' : 'N'}:${index.columns.join(',')}` : '';
      return actual === signature;
    }).map(([, name]) => name),
    ...migration005ForeignKeys.filter(([table, name, signature]) => {
      const foreignKey = foreignKeys.get(`${table}.${name}`);
      const actual = foreignKey
        ? `${foreignKey.columns.join(',')}->${foreignKey.referencedTable}.${foreignKey.referencedColumns.join(',')}:${foreignKey.deleteRule}`
        : '';
      return actual === signature;
    }).map(([, name]) => name),
  ];
  const expected005Count = migration005Tables.length + migration005Columns.length
    + migration005Indexes.length + migration005ForeignKeys.length;
  const migration005State = found005.length === 0
    ? 'absent'
    : found005.length === expected005Count ? 'complete' : 'partial';

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
    migration003State,
    found003,
    expected003Count,
    migration004State,
    found004,
    expected004Count,
    migration005State,
    found005,
    expected005Count,
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

export function assertMigration003Complete(state) {
  if (state.migration003State !== 'complete') {
    throw new Error(
      `migration 003 schema is ${state.migration003State} (${state.found003.length}/${state.expected003Count} expected objects)`,
    );
  }
}

export function assertMigration004Complete(state) {
  if (state.migration004State !== 'complete') {
    throw new Error(
      `migration 004 schema is ${state.migration004State} (${state.found004.length}/${state.expected004Count} expected objects)`,
    );
  }
}

export function assertMigration005Complete(state) {
  if (state.migration005State !== 'complete') {
    throw new Error(
      `migration 005 schema is ${state.migration005State} (${state.found005.length}/${state.expected005Count} expected objects)`,
    );
  }
}

export const integrityChecks = {
  duplicate_usernames: 'SELECT COUNT(*) AS count FROM (SELECT username FROM users GROUP BY username HAVING COUNT(*) > 1) duplicates',
  invalid_user_roles: "SELECT COUNT(*) AS count FROM users WHERE role NOT IN ('user', 'teacher', 'admin', 'super_admin') OR role IS NULL",
  invalid_session_versions: 'SELECT COUNT(*) AS count FROM users WHERE session_version IS NULL OR session_version < 1',
  invalid_topic_moderation_state: `SELECT COUNT(*) AS count FROM topics
    WHERE is_pinned NOT IN (0, 1) OR is_locked NOT IN (0, 1)
       OR (is_pinned = 0 AND (pinned_by IS NOT NULL OR pinned_at IS NOT NULL))
       OR (is_pinned = 1 AND (pinned_by IS NULL OR pinned_at IS NULL))
       OR (is_locked = 0 AND (locked_by IS NOT NULL OR locked_at IS NOT NULL))
       OR (is_locked = 1 AND (locked_by IS NULL OR locked_at IS NULL))`,
  invalid_media_cleanup_status: "SELECT COUNT(*) AS count FROM media_cleanup_queue WHERE status NOT IN ('pending', 'processing', 'failed', 'completed')",
  invalid_follow_categories: "SELECT COUNT(*) AS count FROM user_category_follows WHERE category NOT IN ('Hardware', 'Software', 'Network', 'AI & Data', 'General')",
  invalid_self_follows: 'SELECT COUNT(*) AS count FROM user_author_follows WHERE follower_id = author_id',
  invalid_notification_preferences: `SELECT COUNT(*) AS count FROM notification_preferences
    WHERE comments_enabled NOT IN (0, 1) OR likes_enabled NOT IN (0, 1)
       OR solutions_enabled NOT IN (0, 1) OR followed_categories_enabled NOT IN (0, 1)
       OR followed_authors_enabled NOT IN (0, 1)`,
  orphan_category_follows: 'SELECT COUNT(*) AS count FROM user_category_follows f LEFT JOIN users u ON u.id = f.user_id WHERE u.id IS NULL',
  orphan_author_follows: 'SELECT COUNT(*) AS count FROM user_author_follows f LEFT JOIN users follower ON follower.id = f.follower_id LEFT JOIN users author ON author.id = f.author_id WHERE follower.id IS NULL OR author.id IS NULL',
  orphan_notification_preferences: 'SELECT COUNT(*) AS count FROM notification_preferences p LEFT JOIN users u ON u.id = p.user_id WHERE u.id IS NULL',
  orphan_topics: 'SELECT COUNT(*) AS count FROM topics t LEFT JOIN users u ON u.id = t.user_id WHERE t.user_id IS NOT NULL AND u.id IS NULL',
  orphan_comments: 'SELECT COUNT(*) AS count FROM comments c LEFT JOIN topics t ON t.id = c.topic_id LEFT JOIN users u ON u.id = c.user_id LEFT JOIN comments p ON p.id = c.parent_id WHERE t.id IS NULL OR (c.user_id IS NOT NULL AND u.id IS NULL) OR (c.parent_id IS NOT NULL AND p.id IS NULL)',
  orphan_likes: 'SELECT COUNT(*) AS count FROM likes l LEFT JOIN users u ON u.id = l.user_id LEFT JOIN topics t ON t.id = l.topic_id WHERE u.id IS NULL OR t.id IS NULL',
  orphan_bookmarks: 'SELECT COUNT(*) AS count FROM bookmarks b LEFT JOIN users u ON u.id = b.user_id LEFT JOIN topics t ON t.id = b.topic_id WHERE u.id IS NULL OR t.id IS NULL',
  orphan_notifications: 'SELECT COUNT(*) AS count FROM notifications n LEFT JOIN users u ON u.id = n.user_id LEFT JOIN users a ON a.id = n.actor_id LEFT JOIN topics t ON t.id = n.topic_id WHERE u.id IS NULL OR a.id IS NULL OR t.id IS NULL',
  orphan_polls: 'SELECT COUNT(*) AS count FROM polls p LEFT JOIN topics t ON t.id = p.topic_id WHERE t.id IS NULL',
  orphan_poll_options: 'SELECT COUNT(*) AS count FROM poll_options o LEFT JOIN polls p ON p.id = o.poll_id LEFT JOIN topics t ON t.id = p.topic_id WHERE p.id IS NULL OR t.id IS NULL',
  orphan_poll_votes: 'SELECT COUNT(*) AS count FROM poll_votes v LEFT JOIN polls p ON p.id = v.poll_id LEFT JOIN topics t ON t.id = p.topic_id LEFT JOIN users u ON u.id = v.user_id LEFT JOIN poll_options o ON o.id = v.option_id WHERE p.id IS NULL OR t.id IS NULL OR u.id IS NULL OR o.id IS NULL OR o.poll_id <> v.poll_id',
  invalid_evaluation_campaigns: `SELECT COUNT(*) AS count FROM evaluation_campaigns
    WHERE status NOT IN ('draft', 'open', 'closed', 'locked')
       OR data_scope NOT IN ('pilot', 'production')
       OR eligible_member_count < 0
       OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at < starts_at)
       OR (retention_until IS NOT NULL AND ends_at IS NOT NULL AND retention_until < ends_at)`,
  invalid_analytics_consents: `SELECT COUNT(*) AS count FROM analytics_consents
    WHERE status NOT IN ('active', 'withdrawn') OR key_version < 1 OR key_version > 65535
       OR CHAR_LENGTH(subject_key) <> 64
       OR (status = 'active' AND withdrawn_at IS NOT NULL)
       OR (status = 'withdrawn' AND withdrawn_at IS NULL)`,
  invalid_analytics_events: `SELECT COUNT(*) AS count FROM analytics_events
    WHERE data_scope NOT IN ('pilot', 'production') OR event_version <> 1
       OR event_name NOT IN ('page_viewed', 'search_performed', 'search_result_opened',
         'topic_created', 'comment_created', 'like_changed', 'bookmark_changed',
         'category_follow_changed', 'author_follow_changed', 'feed_viewed',
         'onboarding_completed', 'evaluation_started', 'evaluation_submitted', 'feedback_submitted')
       OR (outcome IS NOT NULL AND outcome NOT IN ('attempt', 'success', 'failure'))
       OR (failure_code IS NOT NULL AND failure_code NOT IN ('validation', 'rate_limited', 'network', 'server_error'))
       OR (outcome = 'failure' AND failure_code IS NULL)
       OR (COALESCE(outcome, '') <> 'failure' AND failure_code IS NOT NULL)
       OR CHAR_LENGTH(subject_key) <> 64 OR CHAR_LENGTH(session_key) <> 64
       OR route_path LIKE '%?%' OR route_path LIKE '%#%'`,
  invalid_analytics_campaign_scope: `SELECT COUNT(*) AS count FROM analytics_events e
    INNER JOIN evaluation_campaigns c ON c.id = e.campaign_id
    WHERE e.data_scope <> c.data_scope`,
  inactive_consent_events: `SELECT COUNT(*) AS count FROM analytics_events e
    LEFT JOIN analytics_consents c ON c.subject_key = e.subject_key
    WHERE c.user_id IS NULL OR c.status <> 'active'`,
  invalid_evaluation_responses: `SELECT COUNT(*) AS count FROM evaluation_responses
    WHERE response_status NOT IN ('submitted', 'withdrawn')
       OR (sus_score IS NOT NULL AND (sus_score < 0 OR sus_score > 100))
       OR (response_status = 'submitted' AND (
         respondent_type IS NULL OR experience_level IS NULL OR primary_device IS NULL
         OR sus_answers IS NULL OR sus_score IS NULL OR task_results IS NULL OR withdrawn_at IS NOT NULL
       ))
       OR (response_status = 'withdrawn' AND (
         withdrawn_at IS NULL OR respondent_type IS NOT NULL OR experience_level IS NOT NULL
         OR primary_device IS NOT NULL OR sus_answers IS NOT NULL OR sus_score IS NOT NULL
         OR task_results IS NOT NULL OR open_feedback IS NOT NULL
       ))`,
  invalid_feedback_submissions: `SELECT COUNT(*) AS count FROM feedback_submissions
    WHERE data_scope NOT IN ('pilot', 'production')
       OR category NOT IN ('bug', 'ux_ui', 'feature', 'content', 'other')
       OR (rating IS NOT NULL AND (rating < 1 OR rating > 5))
       OR CHAR_LENGTH(details) < 10 OR CHAR_LENGTH(details) > 2000
       OR status NOT IN ('new', 'reviewing', 'planned', 'resolved', 'declined')
       OR priority NOT IN ('low', 'normal', 'high', 'urgent')
       OR (status IN ('resolved', 'declined') AND resolved_at IS NULL)
       OR (status NOT IN ('resolved', 'declined') AND resolved_at IS NOT NULL)`,
  invalid_feedback_campaign_scope: `SELECT COUNT(*) AS count FROM feedback_submissions f
    INNER JOIN evaluation_campaigns c ON c.id = f.campaign_id
    WHERE f.data_scope <> c.data_scope`,
  orphan_evaluation_campaigns: `SELECT COUNT(*) AS count FROM evaluation_campaigns c
    LEFT JOIN users creator ON creator.id = c.created_by
    LEFT JOIN users updater ON updater.id = c.updated_by
    WHERE (c.created_by IS NOT NULL AND creator.id IS NULL)
       OR (c.updated_by IS NOT NULL AND updater.id IS NULL)`,
  orphan_analytics_consents: 'SELECT COUNT(*) AS count FROM analytics_consents c LEFT JOIN users u ON u.id = c.user_id WHERE u.id IS NULL',
  orphan_analytics_events: `SELECT COUNT(*) AS count FROM analytics_events e
    LEFT JOIN analytics_consents c ON c.subject_key = e.subject_key
    LEFT JOIN evaluation_campaigns campaign ON campaign.id = e.campaign_id
    WHERE c.user_id IS NULL OR (e.campaign_id IS NOT NULL AND campaign.id IS NULL)`,
  orphan_evaluation_responses: `SELECT COUNT(*) AS count FROM evaluation_responses r
    LEFT JOIN evaluation_campaigns c ON c.id = r.campaign_id
    LEFT JOIN users u ON u.id = r.user_id
    WHERE c.id IS NULL OR u.id IS NULL`,
  orphan_feedback_submissions: `SELECT COUNT(*) AS count FROM feedback_submissions f
    LEFT JOIN users u ON u.id = f.user_id
    LEFT JOIN evaluation_campaigns c ON c.id = f.campaign_id
    LEFT JOIN users updater ON updater.id = f.updated_by
    WHERE u.id IS NULL OR (f.campaign_id IS NOT NULL AND c.id IS NULL)
       OR (f.updated_by IS NOT NULL AND updater.id IS NULL)`,
  expired_raw_analytics_events: 'SELECT COUNT(*) AS count FROM analytics_events WHERE received_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 180 DAY)',
  expired_research_records: `SELECT
      (SELECT COUNT(*) FROM evaluation_responses r INNER JOIN evaluation_campaigns c ON c.id = r.campaign_id
       WHERE c.retention_until IS NOT NULL AND c.retention_until <= UTC_TIMESTAMP())
      + (SELECT COUNT(*) FROM feedback_submissions
         WHERE retention_until IS NOT NULL AND retention_until <= UTC_TIMESTAMP()) AS count`,
};

const migration003IntegrityChecks = new Set([
  'invalid_session_versions',
  'invalid_topic_moderation_state',
  'invalid_media_cleanup_status',
]);

const migration004IntegrityChecks = new Set([
  'invalid_follow_categories',
  'invalid_self_follows',
  'invalid_notification_preferences',
  'orphan_category_follows',
  'orphan_author_follows',
  'orphan_notification_preferences',
]);

const migration005IntegrityChecks = new Set([
  'invalid_evaluation_campaigns',
  'invalid_analytics_consents',
  'invalid_analytics_events',
  'invalid_analytics_campaign_scope',
  'inactive_consent_events',
  'invalid_evaluation_responses',
  'invalid_feedback_submissions',
  'invalid_feedback_campaign_scope',
  'orphan_evaluation_campaigns',
  'orphan_analytics_consents',
  'orphan_analytics_events',
  'orphan_evaluation_responses',
  'orphan_feedback_submissions',
  'expired_raw_analytics_events',
  'expired_research_records',
]);

export async function runIntegrityChecks(
  db,
  { includeMigration003 = true, includeMigration004 = true, includeMigration005 = true } = {},
) {
  const failures = [];
  for (const [name, sql] of Object.entries(integrityChecks)) {
    if (!includeMigration003 && migration003IntegrityChecks.has(name)) continue;
    if (!includeMigration004 && migration004IntegrityChecks.has(name)) continue;
    if (!includeMigration005 && migration005IntegrityChecks.has(name)) continue;
    const [rows] = await db.query(sql);
    const count = Number(rows[0].count);
    console.log(`${name}: ${count}`);
    if (count !== 0) failures.push(`${name}=${count}`);
  }
  return failures;
}
