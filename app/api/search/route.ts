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
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

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

    // Use plainto_tsquery for safer user input handling (auto-escapes special chars)
    // We still create tsQuery for prefix matching but with sanitized input
    const tsQuery = sanitizedQuery
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => `${word}:*`)
      .join(" & ");

    // Выполняем полнотекстовый поиск с ранжированием и COUNT в одном запросе
    // Используем COUNT(*) OVER() для получения общего количества без отдельного запроса
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
        total_count: bigint;
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
        ts_rank(l.search_vector, to_tsquery('english', ${tsQuery})) as rank,
        COUNT(*) OVER() as total_count
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
        )
      ORDER BY rank DESC, l.views_count DESC, l.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Получаем total из первого результата (оптимизация: 1 запрос вместо 2)
    const total = results.length > 0 ? Number(results[0].total_count) : 0;

    // Кэшируем результаты поиска на 30 секунд (клиент) / 60 секунд (CDN)
    const response = NextResponse.json(
      {
        results: results.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          description: r.description?.substring(0, 150) + (r.description?.length > 150 ? "..." : ""),
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
        total,
        query,
        limit,
        offset,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
