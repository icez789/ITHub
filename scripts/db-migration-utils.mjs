import { createHash } from 'node:crypto';

export function canonicalizeMigrationSource(source) {
  return String(source).replace(/\r\n?/g, '\n');
}

export function migrationChecksum(source) {
  return createHash('sha256').update(canonicalizeMigrationSource(source)).digest('hex');
}
