import { v2 as cloudinary } from 'cloudinary';
import db from '../lib/db.js';

const apply = process.argv.includes('--apply');
const isProduction = String(process.env.ITHUB_ENVIRONMENT || '').toLowerCase() === 'production';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  if (apply && isProduction && String(process.env.ITHUB_MEDIA_CLEANUP_ALLOW_PRODUCTION).toLowerCase() !== 'true') {
    throw new Error('Production media cleanup requires ITHUB_MEDIA_CLEANUP_ALLOW_PRODUCTION=true');
  }
  const [rows] = await db.query(
    `SELECT id, public_id, resource_type, reason, status, attempts
     FROM media_cleanup_queue
     WHERE status IN ('pending', 'failed')
     ORDER BY created_at ASC
     LIMIT 50`,
  );
  console.log(`Media cleanup candidates: ${rows.length}${apply ? '' : ' (dry-run)'}`);
  if (!apply) {
    for (const row of rows) console.log(`${row.id}: ${row.public_id} [${row.status}]`);
    return;
  }

  for (const row of rows) {
    await db.query("UPDATE media_cleanup_queue SET status = 'processing' WHERE id = ?", [row.id]);
    try {
      const result = await cloudinary.uploader.destroy(row.public_id, { resource_type: row.resource_type });
      if (!['ok', 'not found'].includes(result?.result)) throw new Error(`Unexpected result: ${result?.result || 'unknown'}`);
      await db.query("UPDATE media_cleanup_queue SET status = 'completed', attempts = attempts + 1, last_error = NULL WHERE id = ?", [row.id]);
      console.log(`completed ${row.id}`);
    } catch (error) {
      await db.query(
        "UPDATE media_cleanup_queue SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?",
        [String(error?.message || error).slice(0, 500), row.id],
      );
      console.error(`failed ${row.id}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Media cleanup failed:', error.message);
    process.exit(1);
  });
