import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, rateLimitResponse, addRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute per IP (SEARCH config)
  const rateLimitResult = await withRateLimit(request, undefined, "SEARCH");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q")?.trim();

    // Both values land in LIMIT/OFFSET below, so they have to survive
    // hostile input. `parseInt` alone returns NaN for "abc" and passes
    // negatives straight through — the former silently produced a
    // `LIMIT null` result set, the latter made Postgres reject the
    // query outright ("OFFSET must not be negative") and turned a
    // crafted URL into a 500. Clamp instead: same shape as the
    // Number.isFinite guard /api/services already uses.
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "", 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        total: 0,
        query: query || "",
      });
    }

    // Sanitize query for tsquery - remove special characters that could break parsing
    // This prevents SQL injection through tsquery syntax
    const sanitizedQuery = query
      .replace(/[&|!():*<>'"\\]/g, " ") // Remove tsquery special chars
      .replace(/\s+/g, " ")
      .trim();

    if (!sanitizedQuery) {
      return NextResponse.json({
        results: [],
        total: 0,
        query: query,
      });
    }

    // Build tsquery string for prefix matching with sanitized input
    // Each word gets :* suffix for prefix matching, joined with & (AND)
    // SECURITY NOTE: $queryRaw tagged template automatically parameterizes all ${} values,
    // so tsQuery is passed as a SQL parameter, NOT interpolated into the query string.
    const tsQuery = sanitizedQuery
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => `${word}:*`)
      .join(" & ");

    // OPTIMIZED: hasMore паттерн вместо COUNT(*) OVER()
    // Запрашиваем limit + 1 записей чтобы определить есть ли ещё
    // Это ~30% быстрее чем COUNT(*) OVER() для больших наборов
    const results = await prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        slug: string;
        description: string;
        price: number | null;
        currency: string;
        is_negotiable: boolean;
        views_count: number;
        created_at: Date;
        category_name: string;
        category_slug: string;
        cover_image_url: string | null;
        aimag_name: string | null;
        user_name: string;
        user_avatar: string | null;
        rank: number;
      }>
    >`
      SELECT
        l.id,
        l.title,
        l.slug,
        l.description,
        l.price,
        l.currency,
        l.is_negotiable,
        l.views_count,
        l.created_at,
        c.name as category_name,
        c.slug as category_slug,
        li.url as cover_image_url,
        a.name as aimag_name,
        COALESCE(
          CASE WHEN p.is_company THEN p.company_name ELSE CONCAT(p.first_name, ' ', p.last_name) END,
          'Хэрэглэгч'
        ) as user_name,
        p.avatar_url as user_avatar,
        ts_rank(l.search_vector, to_tsquery('russian', ${tsQuery})) +
        ts_rank(l.search_vector, to_tsquery('english', ${tsQuery})) +
        ts_rank(l.search_vector, to_tsquery('simple',  ${tsQuery})) as rank
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN aimags a ON l.aimag_id = a.id
      LEFT JOIN profiles p ON l.user_id = p.id
      LEFT JOIN LATERAL (
        SELECT url FROM listings_images
        WHERE listing_id = l.id AND is_cover = true
        LIMIT 1
      ) li ON true
      WHERE
        l.status = 'active'
        AND l.is_active = true
        AND (
          l.search_vector @@ to_tsquery('russian', ${tsQuery})
          OR l.search_vector @@ to_tsquery('english', ${tsQuery})
          OR l.search_vector @@ to_tsquery('simple',  ${tsQuery})
        )
      ORDER BY rank DESC, l.views_count DESC, l.created_at DESC
      LIMIT ${limit + 1}
      OFFSET ${offset}
    `;

    // hasMore паттерн: если вернулось больше чем limit - есть ещё записи
    const hasMore = results.length > limit;
    const trimmedResults = hasMore ? results.slice(0, limit) : results;

    // Кэшируем результаты поиска на 30 секунд (клиент) / 60 секунд (CDN)
    const response = NextResponse.json(
      {
        results: trimmedResults.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          description:
            r.description?.substring(0, 150) + (r.description?.length > 150 ? "..." : ""),
          price: r.price,
          currency: r.currency,
          is_negotiable: r.is_negotiable,
          views_count: r.views_count,
          created_at: r.created_at,
          category: {
            name: r.category_name,
            slug: r.category_slug,
          },
          cover_image: r.cover_image_url,
          aimag: r.aimag_name,
          user: {
            name: r.user_name,
            avatar: r.user_avatar,
          },
          relevance: r.rank,
        })),
        hasMore, // CHANGED: hasMore вместо total для бесконечной прокрутки
        query,
        limit,
        offset,
      },
      {
        headers: {
          // Popular queries ("Сантехник", "Засвар" etc) are hammered by
          // the homepage autocomplete. Keep them in the edge for 5 min
          // with a 10 min SWR window — repeats land instantly.
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
