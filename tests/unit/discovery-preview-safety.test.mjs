import test from 'node:test';
import assert from 'node:assert/strict';
import { isDiscoveryPreviewUrl, previewDatabaseIdentity } from '../../scripts/discovery-preview-safety.mjs';
import { validatePreviewAccessUrl } from '../preview-access.mjs';

test('preview smoke never accepts production or unrelated deployment URLs', () => {
  assert.equal(isDiscoveryPreviewUrl('https://it-abc123-thiraphat-s-projects.vercel.app'), true);
  for (const url of ['https://ithub-puce.vercel.app', 'https://example.com',
    'http://it-abc123-thiraphat-s-projects.vercel.app']) {
    assert.equal(isDiscoveryPreviewUrl(url), false);
  }
});

test('protected Preview access accepts only a token for the same immutable deployment', () => {
  const base = 'https://it-abc123-thiraphat-s-projects.vercel.app';
  assert.equal(
    validatePreviewAccessUrl(base, `${base}/?_vercel_share=temporary-test-token`),
    `${base}/?_vercel_share=temporary-test-token`,
  );
  assert.equal(validatePreviewAccessUrl(base, ''), null);
  assert.throws(
    () => validatePreviewAccessUrl(base, 'https://it-other-thiraphat-s-projects.vercel.app/?_vercel_share=x'),
    /must match/,
  );
  assert.throws(() => validatePreviewAccessUrl(base, `${base}/`), /share token/);
});

test('preview database guard requires isolated write opt-in and real credentials', () => {
  const fixture = {
    DB_HOST: 'fixture.invalid', DB_PORT: '4000', DB_USER: 'fixture',
    DB_PASSWORD: 'fixture-only', DB_NAME: 'fixture_e2e',
    ITHUB_E2E_ENVIRONMENT: 'e2e', ITHUB_E2E_ALLOW_WRITES: 'true',
  };
  const original = Object.fromEntries(Object.keys(fixture).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, fixture);
    const identity = previewDatabaseIdentity();
    assert.match(identity, /^[a-f0-9]{64}$/);
    process.env.DB_NAME = 'another_e2e';
    assert.notEqual(previewDatabaseIdentity(), identity);
    process.env.DB_NAME = 'test';
    assert.throws(previewDatabaseIdentity, /must end with _e2e/);
    Object.assign(process.env, fixture, { ITHUB_E2E_ALLOW_WRITES: 'false' });
    assert.throws(previewDatabaseIdentity, /must be exactly true/);
    Object.assign(process.env, fixture, { ITHUB_E2E_ENVIRONMENT: 'production' });
    assert.throws(previewDatabaseIdentity, /environment is production/);
    Object.assign(process.env, fixture, { DB_PASSWORD: '[SENSITIVE]' });
    assert.throws(previewDatabaseIdentity, /real isolated database value/);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
