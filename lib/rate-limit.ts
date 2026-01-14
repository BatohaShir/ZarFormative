import { NextRequest, NextResponse } from "next/server";

// In-memory store for rate limiting (for development)
// In production, use Redis (Upstash) for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  // Maximum number of requests allowed in the window
  limit: number;
  // Time window in seconds
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limiter
 * For production, replace with Upstash Redis:
 *
 * ```
 * npm install @upstash/ratelimit @upstash/redis
 *
 * import { Ratelimit } from "@upstash/ratelimit";
 * import { Redis } from "@upstash/redis";
 *
 * const ratelimit = new Ratelimit({
 *   redis: Redis.fromEnv(),
 *   limiter: Ratelimit.slidingWindow(10, "60 s"),
 * });
 * ```
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 60, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetTime) {
    // New window
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetTime,
    };
  }

  if (existing.count >= config.limit) {
    // Rate limited
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetTime: existing.resetTime,
    };
  }

  // Increment counter
  existing.count++;
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - existing.count,
    resetTime: existing.resetTime,
  };
}

/**
 * Get identifier for rate limiting from request
 * Uses IP address or user ID if authenticated
 */
export function getRateLimitIdentifier(
  request: NextRequest,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP from headers (works behind proxies)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ||
             request.headers.get("x-real-ip") ||
             "unknown";

  return `ip:${ip}`;
}

/**
 * Rate limit response with proper headers
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetTime.toString(),
        "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
      },
    }
  );
}

/**
 * Middleware helper for rate limiting
 */
export function withRateLimit(
  request: NextRequest,
  userId?: string,
  config?: RateLimitConfig
): RateLimitResult {
  const identifier = getRateLimitIdentifier(request, userId);
  return checkRateLimit(identifier, config);
}
