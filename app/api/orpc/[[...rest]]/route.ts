import { RPCHandler } from "@orpc/server/fetch";
import { appRouter } from "@/lib/orpc/router";
import { createORPCContext } from "@/lib/orpc/context";
import { withRateLimit, rateLimitResponse, addRateLimitHeaders } from "@/lib/rate-limit";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Single HTTP entrypoint for every oRPC procedure, replacing the
 * generated ZenStack REST route at /api/model/[...path].
 *
 * Rate limiting mirrors what that route did: reads use the API
 * bucket, writes use the stricter MUTATION bucket. oRPC sends
 * everything over POST, so the read/write split comes from the
 * procedure path rather than the HTTP verb — GET here only serves
 * oRPC's own cacheable-request support.
 */
const handler = new RPCHandler(appRouter);

async function handle(request: NextRequest, configKey: "API" | "MUTATION") {
  const context = await createORPCContext();

  const rateLimitResult = await withRateLimit(request, context.user?.id, configKey);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  const { response } = await handler.handle(request, {
    prefix: "/api/orpc",
    context,
  });

  const nextResponse = response
    ? new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    : NextResponse.json({ error: "Not found" }, { status: 404 });

  return addRateLimitHeaders(nextResponse, rateLimitResult);
}

export async function GET(request: NextRequest) {
  return handle(request, "API");
}

export async function POST(request: NextRequest) {
  return handle(request, "MUTATION");
}
