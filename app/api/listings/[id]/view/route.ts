import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, rateLimitResponse, addRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Период уникальности просмотра (24 часа)
const VIEW_UNIQUENESS_PERIOD_HOURS = 24;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 60 view requests per minute per IP (VIEW config)
  const rateLimitResult = await withRateLimit(request, undefined, "VIEW");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const { id: slug } = await params;

    // Получаем IP адрес
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

    // Получаем текущего пользователя (если авторизован)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const viewerId = user?.id || null;

    // Находим объявление по slug
    const listing = await prisma.listings.findFirst({
      where: {
        slug: slug,
        status: "active",
        is_active: true,
      },
      select: { id: true, user_id: true, views_count: true },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Не считаем просмотры владельца объявления
    if (viewerId && viewerId === listing.user_id) {
      return NextResponse.json({
        success: true,
        views_count: Number(listing.views_count),
        skipped: true,
        reason: "owner",
      });
    }

    // Оптимизированный запрос: проверка + вставка + инкремент в одном SQL
    // Это устраняет race condition и уменьшает количество round-trips
    const result = await prisma.$queryRaw<{ views_count: number; inserted: boolean }[]>`
      WITH check_existing AS (
        SELECT id FROM listings_views
        WHERE listing_id = ${listing.id}::uuid
          AND viewed_at > NOW() - INTERVAL '${Prisma.raw(String(VIEW_UNIQUENESS_PERIOD_HOURS))} hours'
          AND (
            ${viewerId ? Prisma.sql`viewer_id = ${viewerId}::uuid` : Prisma.sql`viewer_id IS NULL AND ip_address = ${ip}`}
          )
        LIMIT 1
      ),
      insert_view AS (
        INSERT INTO listings_views (id, listing_id, viewer_id, ip_address, viewed_at)
        SELECT
          gen_random_uuid(),
          ${listing.id}::uuid,
          ${viewerId ? Prisma.sql`${viewerId}::uuid` : Prisma.sql`NULL`},
          ${viewerId ? Prisma.sql`NULL` : Prisma.sql`${ip}`},
          NOW()
        WHERE NOT EXISTS (SELECT 1 FROM check_existing)
        RETURNING id
      ),
      update_count AS (
        UPDATE listings
        SET views_count = views_count + 1
        WHERE id = ${listing.id}::uuid
          AND EXISTS (SELECT 1 FROM insert_view)
        RETURNING views_count
      )
      SELECT
        COALESCE(
          (SELECT views_count FROM update_count),
          ${listing.views_count}
        ) as views_count,
        EXISTS (SELECT 1 FROM insert_view) as inserted
    `;

    const { views_count, inserted } = result[0];

    // Convert BigInt to Number for JSON serialization
    const viewsCountNumber = typeof views_count === 'bigint' ? Number(views_count) : views_count;

    if (!inserted) {
      const response = NextResponse.json({
        success: true,
        views_count: viewsCountNumber,
        skipped: true,
        reason: "already_viewed",
      });
      return addRateLimitHeaders(response, rateLimitResult);
    }

    const response = NextResponse.json({
      success: true,
      views_count: viewsCountNumber,
    });
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    logger.error("Error tracking view:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
