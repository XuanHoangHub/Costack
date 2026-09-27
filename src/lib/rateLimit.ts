import 'server-only';

import { createHash } from 'node:crypto';

type Bucket = { count: number; resetAt: number };

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();

function requestIdentity(request: Request) {
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = cfIp || realIp || forwarded || 'unknown';
  const credential = request.headers.get('authorization')?.slice(0, 64) || '';
  return createHash('sha256').update(`${ip}|${credential}`).digest('hex').slice(0, 32);
}

export function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const key = `${scope}:${requestIdentity(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      pruneRateLimitBuckets();
      if (buckets.size >= MAX_BUCKETS) {
        // Evict oldest entries if saturated to prevent memory exhaustion DoS
        const excess = buckets.size - MAX_BUCKETS + 100;
        let evicted = 0;
        for (const k of buckets.keys()) {
          buckets.delete(k);
          evicted++;
          if (evicted >= excess) break;
        }
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, remaining: limit - current.count, retryAfterSeconds: 0 };
}

export function pruneRateLimitBuckets() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
