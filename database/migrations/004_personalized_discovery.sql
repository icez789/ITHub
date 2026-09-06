-- Additive Phase 2 personalized discovery schema. Keep prior migrations immutable.

CREATE TABLE user_category_follows (
  user_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, category),
  KEY idx_category_follows_category (category, user_id),
  CONSTRAINT fk_category_follows_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE user_author_follows (
  follower_id INT NOT NULL,
  author_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, author_id),
  KEY idx_author_follows_author (author_id, follower_id),
  CONSTRAINT fk_author_follows_follower FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_author_follows_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE notification_preferences (
  user_id INT NOT NULL,
  comments_enabled TINYINT(1) NOT NULL DEFAULT 1,
  likes_enabled TINYINT(1) NOT NULL DEFAULT 1,
  solutions_enabled TINYINT(1) NOT NULL DEFAULT 1,
  followed_categories_enabled TINYINT(1) NOT NULL DEFAULT 0,
  followed_authors_enabled TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
