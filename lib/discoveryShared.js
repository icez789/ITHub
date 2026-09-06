export const DISCOVERY_CATEGORIES = Object.freeze([
  'Hardware',
  'Software',
  'Network',
  'AI & Data',
  'General',
]);

export const DISCOVERY_FEEDS = new Set(['following', 'for-you']);
export const DISCOVERY_SORTS = new Set(['latest', 'popular', 'likes']);

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  comments_enabled: true,
  likes_enabled: true,
  solutions_enabled: true,
  followed_categories_enabled: false,
  followed_authors_enabled: false,
});

export function isDiscoveryCategory(value) {
  return DISCOVERY_CATEGORIES.includes(String(value || ''));
}

export function parseBoolean(value) {
  if (value === true || value === 'true' || value === '1' || value === 'on') return true;
  if (value === false || value === 'false' || value === '0' || value === 'off') return false;
  throw new Error('Invalid follow state');
}

export function calculateRecommendationScore({
  followsAuthor = false,
  followsCategory = false,
  ageDays = 0,
  likeCount = 0,
  commentCount = 0,
  views = 0,
}) {
  const freshness = Math.max(0, 30 - Math.max(0, Number(ageDays) || 0));
  const viewSignal = Math.min(3, Math.floor(Math.log2(Math.max(0, Number(views) || 0) + 1)));
  const engagement = Math.min(
    10,
    (Math.max(0, Number(likeCount) || 0) * 2)
      + Math.max(0, Number(commentCount) || 0)
      + viewSignal,
  );
  return (followsAuthor ? 60 : 0) + (followsCategory ? 40 : 0) + freshness + engagement;
}

export function recommendationReason(followsAuthor, followsCategory) {
  if (followsAuthor && followsCategory) return 'ติดตามผู้เขียนและหมวดนี้';
  if (followsAuthor) return 'ติดตามผู้เขียน';
  if (followsCategory) return 'ติดตามหมวดนี้';
  return null;
}
