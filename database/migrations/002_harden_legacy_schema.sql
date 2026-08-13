-- Remove only rows whose referenced records no longer exist. These rows cannot
-- be surfaced correctly by the application and would prevent adding FKs.
DELETE l FROM likes l
LEFT JOIN users u ON u.id = l.user_id
LEFT JOIN topics t ON t.id = l.topic_id
WHERE u.id IS NULL OR t.id IS NULL;

DELETE n FROM notifications n
LEFT JOIN users recipient ON recipient.id = n.user_id
LEFT JOIN users actor ON actor.id = n.actor_id
LEFT JOIN topics t ON t.id = n.topic_id
WHERE recipient.id IS NULL OR actor.id IS NULL OR t.id IS NULL;

ALTER TABLE users
  ADD CONSTRAINT uq_users_username UNIQUE (username);

ALTER TABLE topics
  ADD KEY idx_topics_user (user_id),
  ADD CONSTRAINT fk_topics_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE comments
  ADD KEY idx_comments_topic (topic_id),
  ADD KEY idx_comments_user (user_id),
  ADD KEY idx_comments_parent (parent_id),
  ADD CONSTRAINT fk_comments_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE SET NULL;

ALTER TABLE likes
  ADD KEY idx_likes_topic (topic_id),
  ADD CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_likes_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE;

ALTER TABLE notifications
  ADD KEY idx_notifications_user (user_id),
  ADD KEY idx_notifications_actor (actor_id),
  ADD KEY idx_notifications_topic (topic_id),
  ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_notifications_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE;

ALTER TABLE polls
  ADD CONSTRAINT fk_polls_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE;

ALTER TABLE poll_options
  ADD CONSTRAINT fk_poll_options_poll FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE;

ALTER TABLE poll_votes
  ADD KEY idx_poll_votes_poll (poll_id),
  ADD KEY idx_poll_votes_option (option_id),
  ADD CONSTRAINT fk_poll_votes_poll FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_poll_votes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_poll_votes_option FOREIGN KEY (option_id) REFERENCES poll_options (id) ON DELETE CASCADE;
