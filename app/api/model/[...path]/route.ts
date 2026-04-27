import { NextRequest, NextResponse } from "next/server";
import { NextRequestHandler } from "@zenstackhq/server/next";
import { getEnhancedPrisma } from "@/prisma/enhanced";
import { withRateLimit, rateLimitResponse, addRateLimitHeaders } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

/**
 * Catch-all REST entrypoint for ZenStack-generated CRUD operations.
 *
 * The route used to also embed a status-transition validator for
 * `listing_requests` updates. That logic now lives in the
 * `transitionRequest` Server Action (app/actions/request-transition.ts)
 * — single source of truth for state machine + auth + side effects,
 * all running inside one prisma.$transaction. The schema's
 * `status @deny('update', true)` rule blocks any attempt to flip
 * status through this REST path, forcing every status change
 * through the action.
 *
 * What stays here: ZenStack's generic CRUD handler + per-route
 * rate limiting. No bespoke business logic.
 */

const zenStackHandler = NextRequestHandler({
  getPrisma: async () => await getEnhancedPrisma(),
  useAppDir: true,
});

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

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
    // Anonymous request — fall through to rate limit by IP.
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

export async function GET(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "API", zenStackHandler);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withRateLimitWrapper(request, context, "MUTATION", zenStackHandler);
}
