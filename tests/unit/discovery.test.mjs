import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  calculateRecommendationScore,
  isDiscoveryCategory,
  parseBoolean,
  recommendationReason,
} from '../../lib/discoveryShared.js';

test('accepts only the five discovery categories', () => {
  for (const category of ['Hardware', 'Software', 'Network', 'AI & Data', 'General']) {
    assert.equal(isDiscoveryCategory(category), true);
  }
  assert.equal(isDiscoveryCategory('Security'), false);
  assert.equal(isDiscoveryCategory('general'), false);
  assert.equal(isDiscoveryCategory(null), false);
});

test('validates follow state and rejects malformed mutations', () => {
  for (const value of [true, 'true', '1', 'on']) assert.equal(parseBoolean(value), true);
  for (const value of [false, 'false', '0', 'off']) {
    assert.equal(parseBoolean(value), false);
  }
  for (const value of ['yes', '', null, undefined, {}, []]) {
    assert.throws(() => parseBoolean(value), /Invalid follow state/);
  }
});

test('notification defaults enable direct activity and disable follow fan-out', () => {
  assert.deepEqual(DEFAULT_NOTIFICATION_PREFERENCES, {
    comments_enabled: true,
    likes_enabled: true,
    solutions_enabled: true,
    followed_categories_enabled: false,
    followed_authors_enabled: false,
  });
});

test('recommendation score applies signal weights, caps, and stale freshness', () => {
  assert.equal(calculateRecommendationScore({ followsAuthor: true }), 90);
  assert.equal(calculateRecommendationScore({ followsCategory: true }), 70);
  assert.equal(calculateRecommendationScore({ followsAuthor: true, followsCategory: true }), 130);
  assert.equal(calculateRecommendationScore({
    followsAuthor: true,
    followsCategory: true,
    ageDays: 5,
    likeCount: 20,
    commentCount: 20,
    views: 10_000,
  }), 135);
  assert.equal(calculateRecommendationScore({ ageDays: 60, views: 7 }), 3);
  assert.equal(calculateRecommendationScore({ ageDays: -4, likeCount: -2, views: -10 }), 30);
});

test('recommendation reason explains the strongest explicit signals', () => {
  assert.equal(recommendationReason(true, true), 'ติดตามผู้เขียนและหมวดนี้');
  assert.equal(recommendationReason(true, false), 'ติดตามผู้เขียน');
  assert.equal(recommendationReason(false, true), 'ติดตามหมวดนี้');
  assert.equal(recommendationReason(false, false), null);
});
