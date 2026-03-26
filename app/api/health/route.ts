import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check endpoint for monitoring and load balancers.
 * GET /api/health
 */
export async function GET() {
  const start = Date.now();

  let dbStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  const response = {
    status: dbStatus === "ok" ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: dbStatus,
    },
    responseTime: Date.now() - start,
  };

  return NextResponse.json(response, {
    status: dbStatus === "ok" ? 200 : 503,
  });
}
