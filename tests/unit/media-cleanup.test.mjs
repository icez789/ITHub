import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupMediaAsset } from '../../lib/mediaCleanupCore.js';

test('media cleanup accepts deleted and already-missing assets', async () => {
  for (const result of ['ok', 'not found']) {
    let queued = false;
    const outcome = await cleanupMediaAsset({ publicId: 'asset', reason: 'test', destroy: async () => ({ result }), queue: async () => { queued = true; } });
    assert.equal(outcome.success, true);
    assert.equal(queued, false);
  }
});

test('media cleanup queues a retry after provider failure', async () => {
  let queued;
  const outcome = await cleanupMediaAsset({ publicId: 'asset', reason: 'replace', destroy: async () => { throw new Error('offline'); }, queue: async (...args) => { queued = args; } });
  assert.equal(outcome.success, false);
  assert.equal(queued[0], 'asset');
  assert.equal(queued[1], 'replace');
});
