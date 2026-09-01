import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdminRole, isContentModeratorRole, isKnownRole } from '../../lib/roles.js';

test('role helpers preserve the teacher moderation boundary', () => {
  assert.equal(isKnownRole('teacher'), true);
  assert.equal(isContentModeratorRole('teacher'), true);
  assert.equal(isAdminRole('teacher'), false);
  assert.equal(isAdminRole('admin'), true);
  assert.equal(isContentModeratorRole('made_up_role'), false);
});
