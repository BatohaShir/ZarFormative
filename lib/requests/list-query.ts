/**
 * SSR data for /account/me/requests.
 *
 * Pulls every request where the current user is either the client or
 * the provider, folded into one $queryRaw CTE with all the relations
 * the list + detail modal consume. Previously the page mounted as
 * "use client" + dynamic(ssr: false), so on a cold visit the user
 * paid: session read → chunk download → hydration → findMany with
 * 6 nested selects. That's ~3–4s on MN→Seoul.
 *
 * Result shape mirrors RequestWithRelations so the SSR payload can
 * be fed straight into React Query via setQueryData — the list
 * hook sees isFetched: true on mount and skips the REST call.
 */

import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db/retry";
import type { RequestWithRelations } from "@/app/account/me/requests/_components/types";

/**
 * SSR row shape. Dates ride as ISO strings through pg → JSON; the
 * page or a small wrapper revives them to Date before handing over
 * to the client so types stay honest.
 */
export interface RequestSsrRow extends Omit<
  RequestWithRelations,
  | "preferred_date"
  | "created_at"
  | "updated_at"
  | "accepted_at"
  | "started_at"
  | "completed_at"
  | "review"
> {
  preferred_date: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  review: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
  } | null;
}

export interface RequestsPageData {
  /** All rows where the user is client_id or provider_id. */
  requests: RequestSsrRow[];
  /**
   * Ids of requests for which a `request_expired` notification
   * already exists, so the client can skip re-sending. Computed
   * server-side as part of the same round-trip.
   */
  notifiedExpiredIds: string[];
}

interface RawRow {
  requests: RequestSsrRow[] | null;
  notified_ids: string[] | null;
}

export async function fetchRequestsPageData(userId: string): Promise<RequestsPageData> {
  try {
    const rows = await withDbRetry(
      () => prisma.$queryRaw<RawRow[]>`
      WITH r AS (
        SELECT jsonb_agg(row ORDER BY created_at DESC) AS data FROM (
          SELECT
            req.id, req.listing_id, req.client_id, req.provider_id,
            req.message, req.status::text AS status,
            req.provider_response, req.image_url,
            req.preferred_date, req.preferred_time,
            req.created_at, req.updated_at,
            req.accepted_at, req.started_at, req.completed_at,
            req.completion_description, req.completion_photos,
            req.proposed_price,
            req.aimag_id, req.district_id, req.khoroo_id,
            req.address_detail, req.latitude, req.longitude,
            req.client_phone,
            CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', a.id, 'name', a.name,
              'latitude', a.latitude, 'longitude', a.longitude
            ) END AS aimag,
            CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', d.id, 'name', d.name,
              'latitude', d.latitude, 'longitude', d.longitude
            ) END AS district,
            CASE WHEN k.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', k.id, 'name', k.name
            ) END AS khoroo,
            jsonb_build_object(
              'id', l.id,
              'title', l.title,
              'slug', l.slug,
              'service_type', l.service_type::text,
              'address', l.address,
              'price', l.price,
              'is_negotiable', l.is_negotiable,
              'phone', l.phone,
              'latitude', l.latitude,
              'longitude', l.longitude,
              'images', COALESCE(
                (SELECT jsonb_agg(
                   jsonb_build_object('url', li.url, 'is_cover', li.is_cover)
                   ORDER BY li.is_cover DESC
                 )
                 FROM (
                   SELECT li.url, li.is_cover
                   FROM listings_images li
                   WHERE li.listing_id = l.id
                   ORDER BY li.is_cover DESC
                   LIMIT 1
                 ) li),
                '[]'::jsonb
              )
            ) AS listing,
            jsonb_build_object(
              'id', c.id,
              'first_name', c.first_name,
              'last_name', c.last_name,
              'company_name', c.company_name,
              'is_company', c.is_company,
              'avatar_url', c.avatar_url
            ) AS client,
            jsonb_build_object(
              'id', pv.id,
              'first_name', pv.first_name,
              'last_name', pv.last_name,
              'company_name', pv.company_name,
              'is_company', pv.is_company,
              'avatar_url', pv.avatar_url
            ) AS provider,
            CASE WHEN rv.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', rv.id,
              'rating', rv.rating,
              'comment', rv.comment,
              'created_at', rv.created_at
            ) END AS review
          FROM listing_requests req
          JOIN listings l       ON l.id = req.listing_id
          JOIN profiles c       ON c.id = req.client_id
          JOIN profiles pv      ON pv.id = req.provider_id
          LEFT JOIN aimags a    ON a.id = req.aimag_id
          LEFT JOIN districts d ON d.id = req.district_id
          LEFT JOIN khoroos k   ON k.id = req.khoroo_id
          LEFT JOIN reviews rv  ON rv.request_id = req.id
          WHERE req.client_id = ${userId}::uuid OR req.provider_id = ${userId}::uuid
          ORDER BY req.created_at DESC
        ) row
      ),
      -- Set of request ids this user has already been notified about
      -- being expired. The client uses it to avoid re-creating
      -- duplicate notifications on every visit.
      notified AS (
        SELECT COALESCE(array_agg(request_id), ARRAY[]::uuid[]) AS ids
        FROM notifications
        WHERE user_id = ${userId}::uuid
          AND type = 'request_expired'
          AND request_id IS NOT NULL
      )
      SELECT
        COALESCE((SELECT data FROM r), '[]'::jsonb) AS requests,
        (SELECT ids FROM notified) AS notified_ids
    `
    );

    const row = rows[0];
    return {
      requests: row?.requests ?? [],
      notifiedExpiredIds: (row?.notified_ids as unknown as string[] | null) ?? [],
    };
  } catch (error) {
    // Page is per-user (revalidate=0, no unstable_cache) so a
    // swallowed null wouldn't be cached, but throwing still gives
    // the user a retry path via error.tsx instead of a misleading
    // "no requests" empty state on a transient DB failure.
    console.error("fetchRequestsPageData failed:", error);
    throw error;
  }
}

/**
 * Revive ISO-string timestamps coming from pg JSON to Date instances
 * that match the `RequestWithRelations` type on the client. Done
 * once at the server→client boundary so the React Query cache can
 * be seeded with already-correct shapes.
 */
export function reviveRequest(raw: RequestSsrRow): RequestWithRelations {
  return {
    ...raw,
    preferred_date: raw.preferred_date ? new Date(raw.preferred_date) : null,
    created_at: new Date(raw.created_at),
    updated_at: new Date(raw.updated_at),
    accepted_at: raw.accepted_at ? new Date(raw.accepted_at) : null,
    started_at: raw.started_at ? new Date(raw.started_at) : null,
    completed_at: raw.completed_at ? new Date(raw.completed_at) : null,
    review: raw.review ? { ...raw.review, created_at: new Date(raw.review.created_at) } : null,
  } as RequestWithRelations;
}
