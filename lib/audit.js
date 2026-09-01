import 'server-only';

import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import db from './db';

function safeMetadata(metadata) {
  if (!metadata) return null;
  const json = JSON.stringify(metadata, (key, value) => (
    /password|token|secret|cookie/i.test(key) ? '[redacted]' : value
  ));
  return json.length <= 8_000 ? json : JSON.stringify({ truncated: true });
}

async function requestId() {
  try {
    const requestHeaders = await headers();
    return String(requestHeaders.get('x-vercel-id') || requestHeaders.get('x-request-id') || randomUUID()).slice(0, 64);
  } catch {
    return randomUUID();
  }
}

export async function writeModerationAudit({
  executor = db,
  actorId,
  action,
  targetType,
  targetId,
  metadata = null,
}) {
  await executor.query(
    `INSERT INTO moderation_audit_logs
       (actor_id, action, target_type, target_id, metadata, request_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      actorId || null,
      String(action).slice(0, 64),
      String(targetType).slice(0, 32),
      String(targetId).slice(0, 191),
      safeMetadata(metadata),
      await requestId(),
    ],
  );
}
