import 'server-only';

const buckets = globalThis.__byteboardRateLimits || new Map();
if (process.env.NODE_ENV !== 'production') globalThis.__byteboardRateLimits = buckets;

export function enforceRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) throw new Error('Too many requests');
  bucket.count += 1;

  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }
}

