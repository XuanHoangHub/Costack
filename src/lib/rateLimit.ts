import 'server-only';

import { createHash } from 'node:crypto';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function requestIdentity(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
  const credential = request.headers.get('authorization') || request.headers.get('x-gemini-api-key') || '';
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
