import 'server-only';

import { v2 as cloudinary } from 'cloudinary';
import db from './db';
import { cleanupMediaAsset } from './mediaCleanupCore';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function errorMessage(error) {
  return String(error?.message || 'Cloudinary cleanup failed').slice(0, 500);
}

export async function queueMediaCleanup(publicId, reason, error, executor = db) {
  if (!publicId) return;
  await executor.query(
    `INSERT INTO media_cleanup_queue
       (public_id, resource_type, reason, status, attempts, last_error)
     VALUES (?, 'image', ?, 'failed', 1, ?)
     ON DUPLICATE KEY UPDATE
       reason = VALUES(reason), status = 'failed', attempts = attempts + 1,
       last_error = VALUES(last_error), updated_at = CURRENT_TIMESTAMP`,
    [publicId, String(reason || 'unspecified').slice(0, 64), errorMessage(error)],
  );
}

export async function destroyMediaAsset(publicId, reason = 'replaced') {
  const outcome = await cleanupMediaAsset({
    publicId,
    reason,
    destroy: (id) => cloudinary.uploader.destroy(id, { resource_type: 'image' }),
    queue: (id, cleanupReason, error) => queueMediaCleanup(id, cleanupReason, error),
  });
  if (outcome.success && !outcome.skipped) {
    await db.query(
      `UPDATE media_cleanup_queue
       SET status = 'completed', last_error = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE public_id = ? AND resource_type = 'image'`,
      [publicId],
    );
  }
  if (!outcome.success) console.error('Cloudinary cleanup failed:', { publicId, reason, message: errorMessage(outcome.error) });
  return { success: outcome.success, skipped: outcome.skipped };
}
