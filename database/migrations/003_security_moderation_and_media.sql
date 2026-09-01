-- Additive milestone 94 schema. Keep prior migrations immutable.

ALTER TABLE users
  ADD COLUMN session_version INT NOT NULL DEFAULT 1 AFTER is_banned,
  ADD COLUMN avatar_public_id VARCHAR(255) NULL AFTER avatar_url;

ALTER TABLE topics ADD COLUMN image_public_id VARCHAR(255) NULL AFTER image_url;
ALTER TABLE topics ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE topics ADD COLUMN pinned_by INT NULL;
ALTER TABLE topics ADD COLUMN pinned_at TIMESTAMP NULL;
ALTER TABLE topics ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE topics ADD COLUMN locked_by INT NULL;
ALTER TABLE topics ADD COLUMN locked_at TIMESTAMP NULL;

ALTER TABLE topics ADD KEY idx_topics_pinned_created (is_pinned, created_at);
ALTER TABLE topics ADD KEY idx_topics_pinned_by (pinned_by);
ALTER TABLE topics ADD KEY idx_topics_locked_by (locked_by);
ALTER TABLE topics ADD CONSTRAINT fk_topics_pinned_by FOREIGN KEY (pinned_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE topics ADD CONSTRAINT fk_topics_locked_by FOREIGN KEY (locked_by) REFERENCES users (id) ON DELETE SET NULL;

CREATE TABLE moderation_audit_logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  actor_id INT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(191) NOT NULL,
  metadata JSON NULL,
  request_id VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_moderation_audit_created (created_at),
  KEY idx_moderation_audit_actor (actor_id),
  KEY idx_moderation_audit_target (target_type, target_id),
  CONSTRAINT fk_moderation_audit_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE media_cleanup_queue (
  id BIGINT NOT NULL AUTO_INCREMENT,
  public_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(32) NOT NULL DEFAULT 'image',
  reason VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_cleanup_asset (public_id, resource_type),
  KEY idx_media_cleanup_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
