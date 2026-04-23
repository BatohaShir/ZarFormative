/**
 * Single $queryRaw CTE for the /services/[slug] page.
 *
 * Before: Prisma findUnique + 5 nested include clauses (user,
 * category, images, aimag, district, khoroo). On pgbouncer's
 * transaction pool those serialise on one connection — that's
 * 6 round-trips, ~3–4s cold from Mongolia to Seoul.
 *
 * Here we fold everything into one CTE that ships the entire listing
 * payload in a single JSON blob. Shape matches ServiceDetailListing
 * so the page component consumes it without mapping.
 */

import { prisma } from "@/lib/prisma";
import type { ServiceDetailListing } from "@/components/service-detail-client";

/**
 * Review row shape matching ReviewWithClient on the client side, so
 * React Query can be seeded with it and ReviewsList skips its own
 * findMany + count round-trips on mount.
 */
export interface ReviewSsrRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    is_company: boolean;
    company_name: string | null;
    is_verified: boolean;
  };
}

export interface ServiceDetailSsrData {
  listing: ServiceDetailListing | null;
  /** Up to 10 most recent reviews, ready for ReviewsList initialData. */
  reviews: ReviewSsrRow[];
  /** Total review count for the "load more" pagination hint. */
  reviewsTotal: number;
}

interface RawRow {
  listing:
    | (Omit<ServiceDetailListing, "user"> & {
        user: Omit<ServiceDetailListing["user"], "created_at"> & { created_at: string };
      })
    | null;
  reviews: ReviewSsrRow[] | null;
  reviews_total: number | null;
}

export async function fetchServiceDetailBySlug(slug: string): Promise<ServiceDetailSsrData> {
  try {
    const rows = await prisma.$queryRaw<RawRow[]>`
      WITH l AS (
        SELECT * FROM listings WHERE slug = ${slug} LIMIT 1
      ),
      rev AS (
        SELECT jsonb_agg(row ORDER BY created_at DESC) AS data
        FROM (
          SELECT
            r.id, r.rating, r.comment, r.created_at,
            jsonb_build_object(
              'id', cp.id,
              'first_name', cp.first_name,
              'last_name', cp.last_name,
              'avatar_url', cp.avatar_url,
              'is_company', cp.is_company,
              'company_name', cp.company_name,
              'is_verified', cp.is_verified
            ) AS client
          FROM reviews r
          JOIN listing_requests lr ON lr.id = r.request_id
          LEFT JOIN profiles cp    ON cp.id = r.client_id
          WHERE lr.listing_id = (SELECT id FROM l)
          ORDER BY r.created_at DESC
          LIMIT 10
        ) row
      ),
      rev_total AS (
        SELECT COUNT(*)::int AS n
        FROM reviews r
        JOIN listing_requests lr ON lr.id = r.request_id
        WHERE lr.listing_id = (SELECT id FROM l)
      )
      SELECT
        CASE WHEN (SELECT id FROM l) IS NULL THEN NULL ELSE jsonb_build_object(
        'id', l.id,
        'title', l.title,
        'slug', l.slug,
        'description', l.description,
        'price', l.price,
        'currency', l.currency,
        'is_negotiable', l.is_negotiable,
        'views_count', l.views_count,
        'duration_minutes', l.duration_minutes,
        'work_hours_start', l.work_hours_start,
        'work_hours_end', l.work_hours_end,
        'service_type', l.service_type::text,
        'address_detail', l.address,
        'latitude', l.latitude,
        'longitude', l.longitude,
        'user', CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', u.id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'avatar_url', u.avatar_url,
          'company_name', u.company_name,
          'is_company', u.is_company,
          'is_verified', u.is_verified,
          'created_at', u.created_at
        ) END,
        'category', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', c.id, 'name', c.name, 'slug', c.slug
        ) END,
        'aimag', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', a.id, 'name', a.name
        ) END,
        'district', CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', d.id, 'name', d.name
        ) END,
        'khoroo', CASE WHEN k.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', k.id, 'name', k.name
        ) END,
        'images', COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', li.id,
              'url', li.url,
              'sort_order', li.sort_order,
              'alt', li.alt
            ) ORDER BY li.sort_order ASC
          )
           FROM listings_images li
           WHERE li.listing_id = l.id
           LIMIT 10),
          '[]'::jsonb
        )
      ) END AS listing,
      COALESCE(rev.data, '[]'::jsonb) AS reviews,
      COALESCE((SELECT n FROM rev_total), 0) AS reviews_total
      FROM l
      LEFT JOIN profiles u   ON u.id = l.user_id
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN aimags a     ON a.id = l.aimag_id
      LEFT JOIN districts d  ON d.id = l.district_id
      LEFT JOIN khoroos k    ON k.id = l.khoroo_id
      LEFT JOIN rev          ON TRUE
    `;

    const row = rows[0];
    if (!row?.listing) {
      return { listing: null, reviews: [], reviewsTotal: 0 };
    }

    // pg numerics → JS numbers; created_at ISO string → Date.
    const listing: ServiceDetailListing = {
      ...row.listing,
      price: row.listing.price != null ? Number(row.listing.price) : (0 as unknown as number),
      latitude: row.listing.latitude != null ? Number(row.listing.latitude) : null,
      longitude: row.listing.longitude != null ? Number(row.listing.longitude) : null,
      user: {
        ...row.listing.user,
        created_at: new Date(row.listing.user.created_at),
      },
    } as ServiceDetailListing;

    return {
      listing,
      reviews: row.reviews ?? [],
      reviewsTotal: Number(row.reviews_total ?? 0),
    };
  } catch (error) {
    console.error("fetchServiceDetailBySlug failed:", error);
    return { listing: null, reviews: [], reviewsTotal: 0 };
  }
}
