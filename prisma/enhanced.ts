import { enhance } from "@zenstackhq/runtime";
import { prisma } from "./index";
import { createClient } from "@/lib/supabase/server";

// In-memory кэш для ролей пользователей (живёт в рамках одного запроса/worker)
// Для продакшена с несколькими серверами рекомендуется Redis
const roleCache = new Map<string, { role: string; timestamp: number }>();
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 минут

async function getUserRole(userId: string): Promise<string> {
  const now = Date.now();
  const cached = roleCache.get(userId);

  // Возвращаем из кэша если не истёк
  if (cached && now - cached.timestamp < ROLE_CACHE_TTL) {
    return cached.role;
  }

  // Получаем из БД и кэшируем
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const role = profile?.role || "user";
  roleCache.set(userId, { role, timestamp: now });

  // Очищаем старые записи (простая стратегия)
  if (roleCache.size > 1000) {
    const oldestAllowed = now - ROLE_CACHE_TTL;
    for (const [key, value] of roleCache.entries()) {
      if (value.timestamp < oldestAllowed) {
        roleCache.delete(key);
      }
    }
  }

  return role;
}

export async function getEnhancedPrisma() {
  const supabase = await createClient();
  let context = {};

  // Используем getUser() - middleware уже обновила сессию,
  // поэтому getUser() безопасен и проверяет аутентичность токена
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Сначала проверяем роль в app_metadata JWT (без запроса к БД)
    const jwtRole = user.app_metadata?.role;

    // Если роль есть в JWT - используем её, иначе получаем из БД с кэшированием
    const role = jwtRole || (await getUserRole(user.id));

    context = {
      user: {
        id: user.id,
        email: user.email,
        role,
      },
    };
  }

  return enhance(prisma, context);
}
