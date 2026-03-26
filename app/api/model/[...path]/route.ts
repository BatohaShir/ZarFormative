import { NextRequest, NextResponse } from "next/server";
import { NextRequestHandler } from "@zenstackhq/server/next";
import { getEnhancedPrisma } from "@/prisma/enhanced";
import { withRateLimit, rateLimitResponse, addRateLimitHeaders } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  validateStatusTransition,
  getUserRequestRole,
  type RequestStatus,
} from "@/lib/validations/request-status";

// Базовый handler ZenStack
const zenStackHandler = NextRequestHandler({
  getPrisma: async () => await getEnhancedPrisma(),
  useAppDir: true,
});

// Тип для context в Next.js App Router
interface RouteContext {
  params: Promise<{ path: string[] }>;
}

/**
 * Validate request status transitions before passing to ZenStack.
 * Returns an error Response if invalid, or null if valid.
 */
async function validateRequestStatusChange(
  request: NextRequest,
  context: RouteContext
): Promise<Response | null> {
  const { path } = await context.params;

  // Only intercept listing_requests update operations
  // ZenStack path format: ["listing_requests", "update"]
  if (path[0] !== "listing_requests" || path[1] !== "update") {
    return null;
  }

  try {
    const body = await request.clone().json();
    const newStatus = body?.data?.status;

    // If no status change, skip validation
    if (!newStatus) return null;

    const requestId = body?.where?.id;
    if (!requestId) return null;

    // Get the current request from DB
    const currentRequest = await prisma.listing_requests.findUnique({
      where: { id: requestId },
      select: { status: true, client_id: true, provider_id: true, updated_at: true },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    // Optimistic locking: if client sends expected_updated_at, verify it matches
    // This prevents race conditions when two users update simultaneously
    const expectedUpdatedAt = body?.data?.expected_updated_at;
    if (expectedUpdatedAt) {
      const expected = new Date(expectedUpdatedAt).getTime();
      const actual = currentRequest.updated_at.getTime();
      if (expected !== actual) {
        return NextResponse.json(
          { error: "Заявка была изменена другим пользователем. Обновите страницу." },
          { status: 409 }
        );
      }
      // Remove the field so it doesn't get saved to DB
      delete body.data.expected_updated_at;
    }

    // Get the authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    }

    // Get user's role from JWT metadata
    const userRole = user.app_metadata?.role;

    // Determine role relative to this request
    const role = getUserRequestRole(
      user.id,
      currentRequest.client_id,
      currentRequest.provider_id,
      userRole
    );

    if (!role) {
      return NextResponse.json({ error: "У вас нет доступа к этой заявке" }, { status: 403 });
    }

    // Validate the transition
    const error = validateStatusTransition(
      currentRequest.status as RequestStatus,
      newStatus as RequestStatus,
      role
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
  } catch {
    // If body parsing fails or other errors, let ZenStack handle it
    return null;
  }

  return null;
}

// Wrapper с rate limiting
async function withRateLimitWrapper(
  request: NextRequest,
  context: RouteContext,
  configKey: "API" | "MUTATION",
  handler: (req: NextRequest, ctx: RouteContext) => Promise<Response>
): Promise<Response> {
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  } catch {
    // Игнорируем ошибки аутентификации
  }

  const rateLimitResult = await withRateLimit(request, userId, configKey);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  const response = await handler(request, context);

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

// PUT - обновление (ниже лимит) + валидация статусов заявок
export async function PUT(request: NextRequest, context: RouteContext) {
  const validationError = await validateRequestStatusChange(request, context);
  if (validationError) return validationError;

  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}

// PATCH - частичное обновление (ниже лимит) + валидация статусов заявок
export async function PATCH(request: NextRequest, context: RouteContext) {
  const validationError = await validateRequestStatusChange(request, context);
  if (validationError) return validationError;

  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}

// DELETE - удаление (ниже лимит)
export async function DELETE(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}
