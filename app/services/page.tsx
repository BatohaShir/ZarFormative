import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServicesListClient, type ServicesFilters } from "@/components/services-list-client";
import type { ListingWithRelations } from "@/components/listing-card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Бүх үйлчилгээ | Tsogts.mn",
  description:
    "Монголын хамгийн том үйлчилгээний платформ. Засвар, тээвэр, сургалт болон бусад үйлчилгээг олоорой.",
  openGraph: {
    title: "Бүх үйлчилгээ | Tsogts.mn",
    description: "Монголын хамгийн том үйлчилгээний платформ",
    type: "website",
  },
};

// ISR: обновляем данные каждые 60 секунд
export const revalidate = 60;

const PAGE_SIZE = 12;
const DESCRIPTION_PREVIEW_LEN = 140;

type SortOption = "newest" | "popular" | "price_asc" | "price_desc";
type ProviderType = "all" | "individual" | "company";

// Shape of each listing row returned by the CTE query. Mirrors
// ListingWithRelations; any drift here will break the card at render time.
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
  created_at: Date | string;
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

/**
 * Parse URL query params into typed filters. Accepts both legacy `category`
 * (single slug) and new `categories` (comma-separated slugs) keys.
 * Anything the client-side UI can set must be reflected here so SSR and
 * hydration render the same rows — otherwise the page flashes the "no
 * filters" result before the client re-fetches with the real filters.
 */
function parseFilters(params: Record<string, string | string[] | undefined>): ServicesFilters {
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

/**
 * Build a tsquery-safe prefix query. Same sanitisation as /api/search:
 * strip tsquery metacharacters, split on whitespace, suffix each token
 * with `:*` for prefix matching, AND them together.
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
      return Prisma.sql`ORDER BY l.price ASC NULLS LAST, l.created_at DESC`;
    case "price_desc":
      return Prisma.sql`ORDER BY l.price DESC NULLS LAST, l.created_at DESC`;
    case "popular":
      return Prisma.sql`ORDER BY l.views_count DESC, l.created_at DESC`;
    case "newest":
    default:
      return Prisma.sql`ORDER BY l.created_at DESC`;
  }
}

/**
 * Single-round-trip SSR loader. Everything the filtered listing grid
 * needs — rows with joined relations, cover image, active boost ids — in
 * one CTE query. Replaces the prior N+1 (findMany + 4 dataloader trips +
 * count + boosts) which paid 5+ round-trips per page load.
 *
 * Filters come from the URL, so hitting /services?q=x&aimag=y returns
 * matching rows from SSR instead of rendering "first 12 of everything"
 * and letting the client re-fetch with the real filters.
 */
async function getServicesData(filters: ServicesFilters) {
  const { categorySlugs, priceMin, priceMax, sort, aimagId, districtId, provider, q } = filters;

  const whereParts: Prisma.Sql[] = [
    Prisma.sql`l.status = 'active'`,
    Prisma.sql`l.is_active = true`,
  ];

  if (categorySlugs.length > 0) {
    whereParts.push(Prisma.sql`c.slug IN (${Prisma.join(categorySlugs)})`);
  }
  if (priceMin > 0) whereParts.push(Prisma.sql`l.price >= ${priceMin}`);
  if (priceMax < 1_000_000) whereParts.push(Prisma.sql`l.price <= ${priceMax}`);

  // district_id is narrower than aimag_id, so if both are present
  // district wins — same logic as the client's where builder.
  if (districtId) {
    whereParts.push(Prisma.sql`l.district_id = ${districtId}::uuid`);
  } else if (aimagId) {
    whereParts.push(Prisma.sql`l.aimag_id = ${aimagId}::uuid`);
  }

  if (provider !== "all") {
    whereParts.push(Prisma.sql`u.is_company = ${provider === "company"}`);
  }

  const tsQuery = q.length >= 2 ? buildTsQuery(q) : null;
  if (tsQuery) {
    // Three-language fulltext (ru+en+simple) matches the trigger in
    // supabase/migrations/.../wave4_fulltext_mongolian.sql. For a quick
    // user fallback on provider names we OR in plain ILIKE on the user
    // fields — those aren't in the listings tsvector.
    whereParts.push(Prisma.sql`(
      l.search_vector @@ to_tsquery('russian', ${tsQuery})
      OR l.search_vector @@ to_tsquery('english', ${tsQuery})
      OR l.search_vector @@ to_tsquery('simple',  ${tsQuery})
      OR u.first_name ILIKE ${"%" + q + "%"}
      OR u.last_name  ILIKE ${"%" + q + "%"}
      OR u.company_name ILIKE ${"%" + q + "%"}
    )`);
  }

  const whereSql = Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}`;
  const orderBySql = buildOrderByFragment(sort);

  try {
    const rows = await prisma.$queryRaw<ServicesDataRow[]>`
      WITH list AS (
        SELECT jsonb_agg(row) AS data FROM (
          SELECT
            l.id, l.user_id, l.title, l.slug, l.description,
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
          LIMIT ${PAGE_SIZE}
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

    // Normalize: trim description, coerce pg numerics to number so
    // serialized RSC props match what ListingCard expects.
    const listings = (row.listings ?? []).map((l) => ({
      ...l,
      description:
        (l.description ?? "").length > DESCRIPTION_PREVIEW_LEN
          ? l.description.slice(0, DESCRIPTION_PREVIEW_LEN) + "…"
          : l.description,
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
    };
  } catch (error) {
    console.error("Failed to load services data:", error);
    return {
      listings: [] as ListingWithRelations[],
      boostedIds: [] as string[],
    };
  }
}

export default async function ServicesPage({
  searchParams,
}: {
  // Next.js 16 passes searchParams as a Promise.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const { listings, boostedIds } = await getServicesData(filters);

  return (
    <ServicesListClient
      initialListings={listings}
      initialBoostedIds={boostedIds}
      initialFilters={filters}
    />
  );
}
