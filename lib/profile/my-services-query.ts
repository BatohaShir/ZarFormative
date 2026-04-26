/**
 * SSR data for /account/me/services.
 *
 * Before: the page was "use client" + dynamic(ssr: false), so cold
 * loads paid a sequential stack of useAuth → REST findMany listings →
 * REST findMany listing_boosts through ZenStack. On MN→Seoul that's
 * ~4–6s of empty skeleton before the grid paints.
 *
 * Here we collapse both queries into one CTE and return the shape the
 * client already expects (ListingWithRelations + ActiveBoost), so the
 * server component can seed React Query via setQueryData and the
 * ZenStack hooks see isFetched: true on mount.
 *
 * The boost filter mirrors the client's one: status='active' AND
 * expires_at > NOW(). We deliberately don't cache this — both
 * listings (user-editable) and boosts (time-sensitive) change often
 * enough that a 30s TTL would make toggle/boost feel stale.
 */
import { prisma } from "@/lib/prisma";

export interface MyServiceRow {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string;
  price: string | number | null;
  currency: string;
  is_negotiable: boolean;
  status: string;
  is_active: boolean;
  views_count: number;
  favorites_count: number;
  created_at: string;
  category: { name: string; slug: string } | null;
  aimag: { name: string } | null;
  images: { id: string; url: string; alt: string | null }[];
}

export interface MyBoostRow {
  id: string;
  listing_id: string;
  user_id: string;
  plan: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface MyServicesSsrData {
  listings: MyServiceRow[];
  activeBoosts: MyBoostRow[];
}

interface RawRow {
  listings: MyServiceRow[] | null;
  active_boosts: MyBoostRow[] | null;
}

export async function fetchMyServicesData(userId: string): Promise<MyServicesSsrData> {
  try {
    const rows = await prisma.$queryRaw<RawRow[]>`
      WITH my_listings AS (
        SELECT jsonb_agg(row ORDER BY created_at DESC) AS data FROM (
          SELECT
            l.id, l.user_id, l.title, l.slug, l.description,
            l.price, l.currency, l.is_negotiable,
            l.status::text AS status,
            l.is_active, l.views_count, l.favorites_count, l.created_at,
            CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
              'name', c.name, 'slug', c.slug
            ) END AS category,
            CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
              'name', a.name
            ) END AS aimag,
            COALESCE(
              (SELECT jsonb_agg(jsonb_build_object('id', li.id, 'url', li.url, 'alt', li.alt))
               FROM listings_images li
               WHERE li.listing_id = l.id AND li.is_cover = true
               LIMIT 1),
              '[]'::jsonb
            ) AS images
          FROM listings l
          LEFT JOIN categories c ON c.id = l.category_id
          LEFT JOIN aimags a ON a.id = l.aimag_id
          WHERE l.user_id = ${userId}::uuid
            AND l.status != 'deleted'
          ORDER BY l.created_at DESC
        ) row
      ),
      my_boosts AS (
        SELECT jsonb_agg(row ORDER BY expires_at DESC) AS data FROM (
          SELECT
            id, listing_id, user_id, plan,
            status::text AS status,
            expires_at, created_at
          FROM listing_boosts
          WHERE user_id = ${userId}::uuid
            AND status = 'active'
            AND expires_at > NOW()
          ORDER BY expires_at DESC
        ) row
      )
      SELECT
        COALESCE(my_listings.data, '[]'::jsonb)::jsonb AS listings,
        COALESCE(my_boosts.data, '[]'::jsonb)::jsonb AS active_boosts
      FROM my_listings, my_boosts
    `;

    const row = rows[0];
    if (!row) return { listings: [], activeBoosts: [] };

    return {
      // pg numeric → string via JSON; client uses formatListingPrice
      // which accepts both. Leave as-is to avoid extra traversal.
      listings: row.listings ?? [],
      activeBoosts: row.active_boosts ?? [],
    };
  } catch (error) {
    // Per-user page, no unstable_cache wrapper, but throwing still
    // routes the user to error.tsx (with a retry button) instead of
    // a misleading "no listings" empty state on transient failure.
    console.error("fetchMyServicesData failed:", error);
    throw error;
  }
}
