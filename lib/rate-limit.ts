import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================
// Rate Limiting Configuration
// ============================================
// В production используем Upstash Redis
// В development используем in-memory store
// ============================================

// Проверяем наличие Redis credentials
const hasRedisConfig = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Redis клиент (singleton)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!hasRedisConfig) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// ============================================
// Rate Limiters для разных endpoints
// ============================================

// Кэш для rate limiters
const rateLimiters = new Map<string, Ratelimit>();

// Предустановленные конфигурации
export const RATE_LIMIT_CONFIGS = {
  // Поиск: 30 запросов в минуту
  SEARCH: { requests: 30, window: "60 s" as const, prefix: "ratelimit:search" },
  // Просмотры: 60 запросов в минуту
  VIEW: { requests: 60, window: "60 s" as const, prefix: "ratelimit:view" },
  // API общий: 100 запросов в минуту
  API: { requests: 100, window: "60 s" as const, prefix: "ratelimit:api" },
  // Мутации (create/update/delete): 30 в минуту
  MUTATION: { requests: 30, window: "60 s" as const, prefix: "ratelimit:mutation" },
  // Аутентификация: 10 попыток в минуту
  AUTH: { requests: 10, window: "60 s" as const, prefix: "ratelimit:auth" },
  // Загрузка файлов: 20 в минуту
  UPLOAD: { requests: 20, window: "60 s" as const, prefix: "ratelimit:upload" },
  // Cron/системные: 5 в минуту
  CRON: { requests: 5, window: "60 s" as const, prefix: "ratelimit:cron" },
} as const;

type RateLimitConfigKey = keyof typeof RATE_LIMIT_CONFIGS;

function getRateLimiter(configKey: RateLimitConfigKey): Ratelimit | null {
  const redisClient = getRedis();
  if (!redisClient) return null;

  const cacheKey = configKey;
  if (rateLimiters.has(cacheKey)) {
    return rateLimiters.get(cacheKey)!;
  }

  const config = RATE_LIMIT_CONFIGS[configKey];
  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: config.prefix,
    analytics: true,
  });

  rateLimiters.set(cacheKey, limiter);
  return limiter;
}

// ============================================
// In-memory fallback для development
// ============================================
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

function checkInMemoryRateLimit(
  identifier: string,
  config: { requests: number; window: string }
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const windowMs = parseInt(config.window) * 1000;
  const key = identifier;

  // Очистка устаревших записей (1% шанс)
  if (Math.random() < 0.01) {
    for (const [k, v] of inMemoryStore.entries()) {
      if (now > v.resetTime) {
        inMemoryStore.delete(k);
      }
    }
  }

  const existing = inMemoryStore.get(key);

  if (!existing || now > existing.resetTime) {
    const resetTime = now + windowMs;
    inMemoryStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: resetTime,
    };
  }

  if (existing.count >= config.requests) {
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      reset: existing.resetTime,
    };
  }

  existing.count++;
  return {
    success: true,
    limit: config.requests,
    remaining: config.requests - existing.count,
    reset: existing.resetTime,
  };
}

// ============================================
// Public API
// ============================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Получить идентификатор для rate limiting
 * Использует userId если есть, иначе IP адрес
 */
export function getRateLimitIdentifier(
  request: NextRequest,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ||
             request.headers.get("x-real-ip") ||
             "unknown";

  return `ip:${ip}`;
}

/**
 * Проверить rate limit для запроса
 */
export async function checkRateLimit(
  identifier: string,
  configKey: RateLimitConfigKey = "API"
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(configKey);
  const config = RATE_LIMIT_CONFIGS[configKey];

  // Используем Redis если доступен
  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      console.error("Redis rate limit error, falling back to in-memory:", error);
      // Fallback to in-memory при ошибке Redis
    }
  }

  // In-memory fallback
  return checkInMemoryRateLimit(
    `${config.prefix}:${identifier}`,
    { requests: config.requests, window: config.window }
  );
}

/**
 * Middleware helper для rate limiting
 * Возвращает RateLimitResult
 */
export async function withRateLimit(
  request: NextRequest,
  userId?: string,
  configKey: RateLimitConfigKey = "API"
): Promise<RateLimitResult> {
  const identifier = getRateLimitIdentifier(request, userId);
  return checkRateLimit(identifier, configKey);
}

/**
 * Синхронная версия для обратной совместимости
 * DEPRECATED: используйте async withRateLimit
 */
export function withRateLimitSync(
  request: NextRequest,
  userId?: string,
  config?: { limit: number; windowSeconds: number }
): RateLimitResult {
  const identifier = getRateLimitIdentifier(request, userId);
  const effectiveConfig = config
    ? { requests: config.limit, window: `${config.windowSeconds} s` }
    : RATE_LIMIT_CONFIGS.API;

  return checkInMemoryRateLimit(
    `ratelimit:sync:${identifier}`,
    effectiveConfig
  );
}

/**
 * Создать HTTP response при превышении лимита
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfter: Math.max(retryAfter, 1),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toString(),
        "Retry-After": Math.max(retryAfter, 1).toString(),
      },
    }
  );
}

/**
 * Добавить rate limit headers к response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());
  return response;
}
