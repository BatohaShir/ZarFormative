/**
 * Simple in-memory rate limiter for client-side upload protection
 * Prevents spam uploads by limiting requests per time window
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  maxRequests: 10, // 10 uploads
  windowMs: 60 * 1000, // per minute
};

/**
 * Check if request should be rate limited
 * @param key - Unique identifier (e.g., userId or "anonymous")
 * @param options - Rate limit configuration
 * @returns { allowed: boolean, remainingRequests: number, resetIn: number }
 */
export function checkRateLimit(
  key: string,
  options: Partial<RateLimitOptions> = {}
): { allowed: boolean; remainingRequests: number; resetIn: number } {
  const { maxRequests, windowMs } = { ...DEFAULT_OPTIONS, ...options };
  const now = Date.now();

  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime < now) {
      rateLimitStore.delete(k);
    }
  }

  const entry = rateLimitStore.get(key);

  // No entry or window expired - allow and create new entry
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remainingRequests: maxRequests - 1,
      resetIn: windowMs,
    };
  }

  // Within window - check count
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetIn: entry.resetTime - now,
    };
  }

  // Increment count and allow
  entry.count += 1;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remainingRequests: maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Clear rate limit for a specific key
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Rate limit configuration for different operations
 */
export const RATE_LIMITS = {
  imageUpload: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
  draftSave: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 saves per minute
  listingCreate: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 creates per minute
} as const;
