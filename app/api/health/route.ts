import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, rateLimitResponse, addRateLimitHeaders } from "@/lib/rate-limit";

/**
 * Health check endpoint for monitoring and load balancers.
 * GET /api/health
 *
 * Rate-limited (CRON config = 5 rpm / IP) so a public path that
 * touches the DB can't be used to add cheap load. The response is
 * deliberately minimal — `uptime` was removed because it tells an
 * attacker exactly when the process last restarted, which is useful
 * input for timing- or session-fixation attacks; monitors that need
 * uptime should pull it from the platform (Vercel/Sentry) instead.
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = await withRateLimit(request, undefined, "CRON");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  let dbStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  const response = NextResponse.json(
    {
      status: dbStatus === "ok" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks: { database: dbStatus },
    },
    { status: dbStatus === "ok" ? 200 : 503 }
  );
  return addRateLimitHeaders(response, rateLimitResult);
}
