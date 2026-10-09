import type { NextFunction, Request, Response } from 'express';

type BucketEntry = {
  count: number;
  resetAt: number;
};

type RateLimiterOptions = {
  name: string;
  maxRequests: number;
  windowMs: number;
};

function safePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : fallback;
}

export function envRateLimit(
  envName: string,
  fallback: number
): number {
  return safePositiveInteger(process.env[envName], fallback);
}

export function rateLimitWindowMs(): number {
  return (
    safePositiveInteger(
      process.env.API_RATE_LIMIT_WINDOW_SECONDS,
      600
    ) * 1000
  );
}

export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, BucketEntry>();

  return function rateLimit(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const now = Date.now();
    const userId = res.locals.authUser?.id as string | undefined;
    const identity =
      userId ||
      req.ip ||
      req.socket.remoteAddress ||
      'anonymous';

    const key = `${options.name}:${identity}`;
    let entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = {
        count: 0,
        resetAt: now + options.windowMs,
      };
      buckets.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(
      options.maxRequests - entry.count,
      0
    );
    const retryAfterSeconds = Math.max(
      Math.ceil((entry.resetAt - now) / 1000),
      1
    );

    res.setHeader(
      'X-RateLimit-Limit',
      String(options.maxRequests)
    );
    res.setHeader(
      'X-RateLimit-Remaining',
      String(remaining)
    );
    res.setHeader(
      'X-RateLimit-Reset',
      String(Math.ceil(entry.resetAt / 1000))
    );

    if (entry.count > options.maxRequests) {
      res.setHeader(
        'Retry-After',
        String(retryAfterSeconds)
      );

      return res.status(429).json({
        error: 'Too many requests',
        retryAfterSeconds,
      });
    }

    if (buckets.size > 10_000) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    next();
  };
}
