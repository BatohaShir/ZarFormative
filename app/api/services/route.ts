import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, rateLimitResponse, addRateLimitHeaders } from "@/lib/rate-limit";
import { fetchServices, parseFilters } from "@/lib/services/query";

/**
 * GET /api/services?<filters>&cursorCreatedAt=&cursorId=&limit=
 *
 * The client uses this to refetch when the user changes a filter or
 * scrolls to the next page. Same CTE as SSR so results are identical
 * to what /services renders.
 *
 * Public endpoint (no auth) — only returns active + public listings
 * that were already fetched in SSR, nothing sensitive.
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = await withRateLimit(request, undefined, "SEARCH");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = parseFilters(searchParams);

    const cursorCreatedAt = searchParams.cursorCreatedAt || undefined;
    const cursorId = searchParams.cursorId || undefined;
    const limitRaw = Number.parseInt(searchParams.limit ?? "", 10);
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;

    // UUID-shaped tokens only — anything weird (injection attempt) is dropped.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const listingIdsRaw = searchParams.listingIds?.split(",").filter(Boolean) ?? [];
    const listingIds = listingIdsRaw.filter((id) => UUID_RE.test(id));

    const result = await fetchServices(filters, {
      cursorCreatedAt,
      cursorId,
      limit,
      listingIds: listingIds.length > 0 ? listingIds : undefined,
    });

    // 1m browser / 5m CDN / 10m SWR. Listings change slowly and the
    // grid is public (no RBAC), so popular filter/search combinations
    // can and should serve from edge cache. Search for "Сантехник"
    // repeated across users now hits Vercel's edge in ~20ms instead
    // of a fresh 2s Postgres round-trip every time.
    const response = NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error("/api/services error:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
