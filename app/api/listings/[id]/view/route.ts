import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, rateLimitResponse, addRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { toNumber } from "@/lib/prisma-utils";

// Период уникальности просмотра (24 часа). Multiplied into a fixed
// `INTERVAL '1 hour'` literal in SQL — passed as a regular `${}`
// parameter so this stays SQL-injection-safe even if someone later
// makes the constant configurable.
const VIEW_UNIQUENESS_PERIOD_HOURS = 24;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // One CTE that does all of:
    //   * resolve the listing by slug and gate on status/is_active;
    //   * skip the owner's own view;
    //   * dedupe against the last 24h of views for this viewer/IP;
    //   * insert the new view row and bump listings.views_count.
    //
    // Previously we did a findUnique first (slug → row), then a
    // separate $queryRaw for the insert+update — two sequential
    // round-trips to Seoul on every detail page view. Fused into one.
    //
    // outcome field:
    //   'not_found'   — listing doesn't exist or isn't live (404);
    //   'owner'       — viewer is the listing's owner, view not counted;
    //   'already'     — seen in the dedup window, view not counted;
    //   'inserted'    — brand-new view, counter bumped.
    const rows = await prisma.$queryRaw<{ outcome: string; views_count: number | null }[]>`
      WITH target AS (
        SELECT id, user_id, views_count
        FROM listings
        WHERE slug = ${slug} AND status = 'active' AND is_active = true
        LIMIT 1
      ),
      already AS (
        SELECT 1
        FROM listings_views v, target t
        WHERE v.listing_id = t.id
          AND v.viewed_at > NOW() - (INTERVAL '1 hour' * ${VIEW_UNIQUENESS_PERIOD_HOURS})
          AND (
            ${viewerId ? Prisma.sql`v.viewer_id = ${viewerId}::uuid` : Prisma.sql`v.viewer_id IS NULL AND v.ip_address = ${ip}`}
          )
        LIMIT 1
      ),
      insert_view AS (
        INSERT INTO listings_views (id, listing_id, viewer_id, ip_address, viewed_at)
        SELECT gen_random_uuid(), t.id,
          ${viewerId ? Prisma.sql`${viewerId}::uuid` : Prisma.sql`NULL`},
          ${viewerId ? Prisma.sql`NULL` : Prisma.sql`${ip}`},
          NOW()
        FROM target t
        WHERE NOT EXISTS (SELECT 1 FROM already)
          ${viewerId ? Prisma.sql`AND t.user_id <> ${viewerId}::uuid` : Prisma.sql``}
        RETURNING id
      ),
      bumped AS (
        UPDATE listings
        SET views_count = views_count + 1
        WHERE id = (SELECT id FROM target)
          AND EXISTS (SELECT 1 FROM insert_view)
        RETURNING views_count
      )
      SELECT
        CASE
          WHEN (SELECT id FROM target) IS NULL                          THEN 'not_found'
          WHEN ${viewerId ? Prisma.sql`(SELECT user_id FROM target) = ${viewerId}::uuid` : Prisma.sql`FALSE`} THEN 'owner'
          WHEN EXISTS (SELECT 1 FROM already)                           THEN 'already'
          ELSE 'inserted'
        END AS outcome,
        COALESCE(
          (SELECT views_count FROM bumped),
          (SELECT views_count FROM target)
        ) AS views_count
    `;

    const row = rows[0];
    if (!row || row.outcome === "not_found") {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const viewsCountNumber = row.views_count != null ? toNumber(row.views_count) : 0;
    const body =
      row.outcome === "inserted"
        ? { success: true, views_count: viewsCountNumber }
        : {
            success: true,
            views_count: viewsCountNumber,
            skipped: true,
            reason: row.outcome,
          };
    const response = NextResponse.json(body);
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    logger.error("Error tracking view:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
