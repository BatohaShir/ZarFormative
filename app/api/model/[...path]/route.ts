import { NextRequest, NextResponse } from "next/server";
import { NextRequestHandler } from "@zenstackhq/server/next";
import { getEnhancedPrisma } from "@/prisma/enhanced";
import { withRateLimit, rateLimitResponse, addRateLimitHeaders } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

// Базовый handler ZenStack
const zenStackHandler = NextRequestHandler({
  getPrisma: async () => await getEnhancedPrisma(),
  useAppDir: true,
});

// Тип для context в Next.js App Router
interface RouteContext {
  params: Promise<{ path: string[] }>;
}

// Wrapper с rate limiting
async function withRateLimitWrapper(
  request: NextRequest,
  context: RouteContext,
  configKey: "API" | "MUTATION",
  handler: (req: NextRequest, ctx: RouteContext) => Promise<Response>
): Promise<Response> {
  // Получаем userId для более точного rate limiting
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  } catch {
    // Игнорируем ошибки аутентификации
  }

  const rateLimitResult = await withRateLimit(request, userId, configKey);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  const response = await handler(request, context);

  // Добавляем rate limit headers к ответу
  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  return addRateLimitHeaders(nextResponse, rateLimitResult);
}

// GET - чтение данных (более высокий лимит)
export async function GET(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "API", zenStackHandler);
}

// POST - создание (ниже лимит)
export async function POST(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}

// PUT - обновление (ниже лимит)
export async function PUT(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}

// PATCH - частичное обновление (ниже лимит)
export async function PATCH(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}

// DELETE - удаление (ниже лимит)
export async function DELETE(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}
