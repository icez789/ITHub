import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalizeMigrationSource, migrationChecksum } from '../../scripts/db-migration-utils.mjs';

test('migration checksums are stable across LF and CRLF checkouts', () => {
  const lf = 'CREATE TABLE example (\n  id INT NOT NULL\n);\n';
  const crlf = lf.replaceAll('\n', '\r\n');
  assert.equal(canonicalizeMigrationSource(crlf), lf);
  assert.equal(migrationChecksum(crlf), migrationChecksum(lf));
});

test('migration checksum preserves every change except line-ending style', () => {
  assert.notEqual(
    migrationChecksum('CREATE TABLE example (id INT);\n'),
    migrationChecksum('CREATE TABLE example (id BIGINT);\n'),
  );
});
