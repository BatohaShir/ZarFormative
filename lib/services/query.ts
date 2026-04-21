/**
 * Shared $queryRaw for the services listing grid.
 *
 * Single source of truth for SSR (app/services/page.tsx) and the client
 * refetch endpoint (app/api/services/route.ts). Kept in one place so
 * the filter → SQL mapping can't drift between the two and cause
 * "SSR shows A, client shows B" flicker.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ListingWithRelations } from "@/components/listing-card";

export const PAGE_SIZE = 12;
export const DESCRIPTION_PREVIEW_LEN = 140;

export type SortOption = "newest" | "popular" | "price_asc" | "price_desc";
export type ProviderType = "all" | "individual" | "company";

export interface ServicesFilters {
  categorySlugs: string[];
  priceMin: number;
  priceMax: number;
  sort: SortOption;
  aimagId: string;
  districtId: string;
  provider: ProviderType;
  q: string;
}

export interface ServicesQueryOptions {
  /** Cursor: id of the last row from the previous page (for infinite scroll). */
  cursorCreatedAt?: string; // ISO timestamp
  cursorId?: string;
  limit?: number;
  /**
   * Client-only override: restrict results to this set of listing ids.
   * Used when the user clicks a cluster on the map — the grid should
   * then show only that cluster's listings. Not derivable from URL
   * filters, so it's passed as its own option rather than added to
   * ServicesFilters.
   */
  listingIds?: string[];
}

export interface ServicesQueryResult {
  listings: ListingWithRelations[];
  boostedIds: string[];
  /** Cursor to pass as cursorCreatedAt/cursorId in the next request, or null if no more. */
  nextCursor: { createdAt: string; id: string } | null;
}

interface RawListingRow {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string;
  price: string | number | null;
  currency: string;
  is_negotiable: boolean;
  service_type: string | null;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  views_count: number;
  favorites_count: number;
  created_at: string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    company_name: string | null;
    is_company: boolean;
  } | null;
  category: { id: string; name: string; slug: string } | null;
  aimag: {
    id: string;
    name: string;
    latitude: string | number | null;
    longitude: string | number | null;
  } | null;
  district: {
    id: string;
    name: string;
    latitude: string | number | null;
    longitude: string | number | null;
  } | null;
  images: { id: string; url: string }[];
}

interface ServicesDataRow {
  listings: RawListingRow[];
  boosted_ids: string[];
}

export const DEFAULT_FILTERS: ServicesFilters = {
  categorySlugs: [],
  priceMin: 0,
  priceMax: 1_000_000,
  sort: "newest",
  aimagId: "",
  districtId: "",
  provider: "all",
  q: "",
};

/**
 * Parse URL query params into typed filters. Shared by SSR (awaits
 * Next.js's async searchParams) and the API route (reads URLSearchParams).
 */
export function parseFilters(
  params: Record<string, string | string[] | undefined>
): ServicesFilters {
  const get = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const categoryLegacy = get("category");
  const categoriesCsv = get("categories");
  const categorySlugs = categoryLegacy
    ? [categoryLegacy]
    : (categoriesCsv?.split(",").filter(Boolean) ?? []);

  const priceMin = Number.parseInt(get("priceMin") ?? "0", 10);
  const priceMax = Number.parseInt(get("priceMax") ?? "1000000", 10);

  const sortRaw = get("sort");
  const sort: SortOption =
    (["newest", "popular", "price_asc", "price_desc"] as const).find((s) => s === sortRaw) ??
    "newest";

  const providerRaw = get("provider");
  const provider: ProviderType =
    (["all", "individual", "company"] as const).find((p) => p === providerRaw) ?? "all";

  return {
    categorySlugs,
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax: Number.isFinite(priceMax) ? priceMax : 1_000_000,
    sort,
    aimagId: get("aimag") ?? "",
    districtId: get("district") ?? "",
    provider,
    q: (get("q") ?? "").trim(),
  };
}

/** Serialize filters into a stable URLSearchParams query fragment. */
export function filtersToSearchParams(filters: ServicesFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.categorySlugs.length > 0) {
    params.set("categories", filters.categorySlugs.join(","));
  }
  if (filters.priceMin > 0) params.set("priceMin", String(filters.priceMin));
  if (filters.priceMax < 1_000_000) params.set("priceMax", String(filters.priceMax));
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.aimagId) params.set("aimag", filters.aimagId);
  if (filters.districtId) params.set("district", filters.districtId);
  if (filters.provider !== "all") params.set("provider", filters.provider);
  if (filters.q) params.set("q", filters.q);
  return params;
}

/**
 * Build a tsquery-safe prefix query. Strip tsquery metacharacters,
 * split on whitespace, suffix each token with `:*`, AND them together.
 */
function buildTsQuery(q: string): string | null {
  const sanitised = q
    .replace(/[&|!():*<>'"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!sanitised) return null;
  const tokens = sanitised.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `${t}:*`).join(" & ");
}

function buildOrderByFragment(sort: SortOption): Prisma.Sql {
  switch (sort) {
    case "price_asc":
      return Prisma.sql`ORDER BY l.price ASC NULLS LAST, l.created_at DESC, l.id DESC`;
    case "price_desc":
      return Prisma.sql`ORDER BY l.price DESC NULLS LAST, l.created_at DESC, l.id DESC`;
    case "popular":
      return Prisma.sql`ORDER BY l.views_count DESC, l.created_at DESC, l.id DESC`;
    case "newest":
    default:
      return Prisma.sql`ORDER BY l.created_at DESC, l.id DESC`;
  }
}

/**
 * Single-round-trip fetch for filtered listings + boost ids.
 *
 * SSR uses this with opts=undefined for the initial 12 rows.
 * The API route uses it with cursor opts for "load next page".
 *
 * One query, one network hop. Previously the same grid needed:
 *   findMany + 4 dataloader joins + count + boosts = 5-7 round-trips.
 * From Mongolia → Seoul that was ~6-15s; now it's one ~2s round-trip.
 */
export async function fetchServices(
  filters: ServicesFilters,
  opts: ServicesQueryOptions = {}
): Promise<ServicesQueryResult> {
  const { categorySlugs, priceMin, priceMax, sort, aimagId, districtId, provider, q } = filters;
  const limit = Math.min(Math.max(opts.limit ?? PAGE_SIZE, 1), 50);

  const whereParts: Prisma.Sql[] = [
    Prisma.sql`l.status = 'active'`,
    Prisma.sql`l.is_active = true`,
  ];

  if (categorySlugs.length > 0) {
    whereParts.push(Prisma.sql`c.slug IN (${Prisma.join(categorySlugs)})`);
  }
  if (priceMin > 0) whereParts.push(Prisma.sql`l.price >= ${priceMin}`);
  if (priceMax < 1_000_000) whereParts.push(Prisma.sql`l.price <= ${priceMax}`);

  // listingIds (from map cluster click) is the narrowest filter — if set,
  // it overrides location filters; otherwise district → aimag fallback.
  if (opts.listingIds && opts.listingIds.length > 0) {
    whereParts.push(
      Prisma.sql`l.id IN (${Prisma.join(opts.listingIds.map((id) => Prisma.sql`${id}::uuid`))})`
    );
  } else if (districtId) {
    whereParts.push(Prisma.sql`l.district_id = ${districtId}::uuid`);
  } else if (aimagId) {
    whereParts.push(Prisma.sql`l.aimag_id = ${aimagId}::uuid`);
  }

  if (provider !== "all") {
    whereParts.push(Prisma.sql`u.is_company = ${provider === "company"}`);
  }

  const tsQuery = q.length >= 2 ? buildTsQuery(q) : null;
  if (tsQuery) {
    whereParts.push(Prisma.sql`(
      l.search_vector @@ to_tsquery('russian', ${tsQuery})
      OR l.search_vector @@ to_tsquery('english', ${tsQuery})
      OR l.search_vector @@ to_tsquery('simple',  ${tsQuery})
      OR u.first_name ILIKE ${"%" + q + "%"}
      OR u.last_name  ILIKE ${"%" + q + "%"}
      OR u.company_name ILIKE ${"%" + q + "%"}
    )`);
  }

  // Keyset cursor: we ordered by (created_at DESC, id DESC) so the
  // cursor tuple is (cursorCreatedAt, cursorId) and we skip anything
  // greater-or-equal to it. This is stable under concurrent inserts,
  // unlike OFFSET which shifts rows around.
  // Only apply for the "newest" sort — other sorts would need their
  // own tuple; for now the client only infinite-scrolls in the default
  // sort. Sort changes reset to page 0.
  if (opts.cursorCreatedAt && opts.cursorId && sort === "newest") {
    whereParts.push(
      Prisma.sql`(l.created_at, l.id) < (${opts.cursorCreatedAt}::timestamp, ${opts.cursorId}::uuid)`
    );
  }

  const whereSql = Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}`;
  const orderBySql = buildOrderByFragment(sort);

  // Request one extra row so we can set nextCursor without a separate
  // COUNT query. If we get back `limit + 1` rows, the last one is the
  // cursor for the next page and we trim it off the result.
  const fetchLimit = limit + 1;

  const rows = await prisma.$queryRaw<ServicesDataRow[]>`
    WITH list AS (
      SELECT jsonb_agg(row) AS data FROM (
        SELECT
          l.id, l.user_id, l.title, l.slug,
          -- Trim description at the DB so we don't ship multi-KB strings
          -- just for a line-clamp-1 card preview. Cast to int because
          -- Prisma binds JS numbers as BigInt and pg's left() doesn't
          -- accept that overload.
          CASE
            WHEN length(l.description) > ${DESCRIPTION_PREVIEW_LEN}::int
              THEN left(l.description, ${DESCRIPTION_PREVIEW_LEN}::int) || '…'
            ELSE l.description
          END AS description,
          l.price, l.currency, l.is_negotiable,
          l.service_type::text AS service_type,
          l.address, l.latitude, l.longitude,
          l.views_count, l.favorites_count, l.created_at,
          CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url,
            'company_name', u.company_name,
            'is_company', u.is_company
          ) END AS "user",
          CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', c.id, 'name', c.name, 'slug', c.slug
          ) END AS category,
          CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', a.id, 'name', a.name,
            'latitude', a.latitude, 'longitude', a.longitude
          ) END AS aimag,
          CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', d.id, 'name', d.name,
            'latitude', d.latitude, 'longitude', d.longitude
          ) END AS district,
          COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('id', li.id, 'url', li.url))
             FROM listings_images li
             WHERE li.listing_id = l.id AND li.is_cover = true
             LIMIT 1),
            '[]'::jsonb
          ) AS images
        FROM listings l
        LEFT JOIN profiles u   ON u.id = l.user_id
        LEFT JOIN categories c ON c.id = l.category_id
        LEFT JOIN aimags a     ON a.id = l.aimag_id
        LEFT JOIN districts d  ON d.id = l.district_id
        ${whereSql}
        ${orderBySql}
        LIMIT ${fetchLimit}::int
      ) row
    ),
    boost AS (
      SELECT COALESCE(array_agg(DISTINCT listing_id), ARRAY[]::uuid[]) AS ids
      FROM listing_boosts
      WHERE status = 'active' AND expires_at > NOW()
    )
    SELECT
      COALESCE(list.data, '[]'::jsonb) AS listings,
      boost.ids AS boosted_ids
    FROM list, boost
  `;

  const row = rows[0] ?? { listings: [], boosted_ids: [] };
  const rawListings = row.listings ?? [];

  // hasMore pattern: if we fetched limit+1, the extra row is the cursor.
  const hasMore = rawListings.length > limit;
  const visible = hasMore ? rawListings.slice(0, limit) : rawListings;
  const last = hasMore ? rawListings[limit - 1] : null;
  const nextCursor =
    hasMore && last && sort === "newest"
      ? { createdAt: String(last.created_at), id: last.id }
      : null;

  const listings = visible.map((l) => ({
    ...l,
    price: l.price != null ? Number(l.price) : null,
    latitude: l.latitude != null ? Number(l.latitude) : null,
    longitude: l.longitude != null ? Number(l.longitude) : null,
    aimag: l.aimag
      ? {
          ...l.aimag,
          latitude: l.aimag.latitude != null ? Number(l.aimag.latitude) : null,
          longitude: l.aimag.longitude != null ? Number(l.aimag.longitude) : null,
        }
      : null,
    district: l.district
      ? {
          ...l.district,
          latitude: l.district.latitude != null ? Number(l.district.latitude) : null,
          longitude: l.district.longitude != null ? Number(l.district.longitude) : null,
        }
      : null,
    images: (l.images ?? []).map((img) => ({ ...img, sort_order: 0 })),
  })) as unknown as ListingWithRelations[];

  return {
    listings,
    boostedIds: row.boosted_ids ?? [],
    nextCursor,
  };
}
