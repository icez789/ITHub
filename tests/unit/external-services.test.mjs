import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPusherBrowserAdapter,
  createPusherServerAdapter,
  externalServiceEnabled,
} from '../../lib/externalServicesCore.js';

test('recognizes intentionally disabled external-service configuration', () => {
  for (const value of ['', '0', 'disabled', 'false', 'off', 'preview-disabled']) {
    assert.equal(externalServiceEnabled(value), false, value);
  }
  assert.equal(externalServiceEnabled('app-id', 'public-key', 'secret', 'ap1'), true);
  assert.equal(externalServiceEnabled('app-id', 'preview-disabled', 'secret', 'ap1'), false);
});

test('server adapter skips delivery without waiting for a disabled Pusher client', async () => {
  const adapter = createPusherServerAdapter(null);
  assert.deepEqual(await adapter.trigger('channel', 'event', { safe: true }), { skipped: true });
  assert.throws(() => adapter.authorizeChannel('1.2', 'private-user-1'), /Pusher is disabled/);
});

test('browser adapter exposes inert subscription methods when Pusher is disabled', () => {
  const adapter = createPusherBrowserAdapter(null);
  const channel = adapter.subscribe('poll-1');
  assert.equal(channel.bind('update', () => {}), undefined);
  assert.equal(channel.unbind('update'), undefined);
  assert.equal(adapter.unsubscribe('poll-1'), undefined);
  assert.equal(adapter.disconnect(), undefined);
});
