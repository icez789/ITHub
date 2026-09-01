import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldNotifyOwner } from '../../lib/notificationPolicy.js';

test('skips notifications for deleted owners and self activity', () => {
  assert.equal(shouldNotifyOwner(null, 2), false);
  assert.equal(shouldNotifyOwner(2, 2), false);
  assert.equal(shouldNotifyOwner(3, 2), true);
});
