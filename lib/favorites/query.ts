/**
 * Shared $queryRaw for the /account/me/favorites page.
 *
 * Mirrors the approach we used for /services: one CTE that returns the
 * user's favorites rows with their listing + cover image + provider +
 * category + aimag all embedded, so SSR pays a single DB round-trip
 * instead of the five or six Prisma dataloader fans out for the nested
 * selects.
 *
 * Result shape is structurally compatible with FavoriteWithListing from
 * contexts/favorites-context so it can be fed straight into React
 * Query's initialData.
 */

import { prisma } from "@/lib/prisma";

export interface FavoritePageRow {
  id: string;
  listing_id: string;
  user_id: string;
  created_at: string;
  listing: {
    id: string;
    title: string;
    slug: string;
    description: string;
    price: string | number | null;
    currency: string;
    is_negotiable: boolean;
    views_count: number;
    favorites_count: number;
    category: { id: string; name: string; slug: string } | null;
    aimag: { id: string; name: string } | null;
    images: { id: string; url: string }[];
    user: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    } | null;
  };
}

interface FavoriteDataRow {
  favorites: FavoritePageRow[] | null;
}

/**
 * Fetch all of `userId`'s favorites + the listing data each card needs,
 * in one round-trip. Returns an empty array for missing / anonymous
 * users so callers can unconditionally render the grid path.
 */
export async function fetchFavoritesPageData(userId: string | null): Promise<FavoritePageRow[]> {
  if (!userId) return [];

  try {
    const rows = await prisma.$queryRaw<FavoriteDataRow[]>`
      WITH fav AS (
        SELECT jsonb_agg(row ORDER BY created_at DESC) AS data FROM (
          SELECT
            f.id, f.listing_id, f.user_id, f.created_at,
            jsonb_build_object(
              'id', l.id,
              'title', l.title,
              'slug', l.slug,
              'description', l.description,
              'price', l.price,
              'currency', l.currency,
              'is_negotiable', l.is_negotiable,
              'views_count', l.views_count,
              'favorites_count', l.favorites_count,
              'category', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
                'id', c.id, 'name', c.name, 'slug', c.slug
              ) END,
              'aimag', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
                'id', a.id, 'name', a.name
              ) END,
              'user', CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object(
                'id', u.id,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'avatar_url', u.avatar_url
              ) END,
              'images', COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('id', li.id, 'url', li.url))
                 FROM listings_images li
                 WHERE li.listing_id = l.id AND li.is_cover = true
                 LIMIT 1),
                '[]'::jsonb
              )
            ) AS listing
          FROM user_favorites f
          JOIN listings l ON l.id = f.listing_id
          LEFT JOIN profiles u ON u.id = l.user_id
          LEFT JOIN categories c ON c.id = l.category_id
          LEFT JOIN aimags a ON a.id = l.aimag_id
          WHERE f.user_id = ${userId}::uuid
            AND l.status = 'active'
            AND l.is_active = true
          ORDER BY f.created_at DESC
        ) row
      )
      SELECT COALESCE(fav.data, '[]'::jsonb)::jsonb AS favorites FROM fav
    `;

    const favorites = rows[0]?.favorites ?? [];
    // Coerce pg numerics. listing.price is Decimal -> string via JSON;
    // everything else we leave alone because the UI reads strings fine.
    return favorites.map((f) => ({
      ...f,
      listing: {
        ...f.listing,
        price: f.listing.price != null ? Number(f.listing.price) : null,
      },
    }));
  } catch (error) {
    console.error("fetchFavoritesPageData failed:", error);
    return [];
  }
}
