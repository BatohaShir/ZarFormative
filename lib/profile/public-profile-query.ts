/**
 * Single $queryRaw CTE for the public /account/[id] page.
 *
 * Previously this page fired three independent unstable_cache'd
 * queries in Promise.all (profile findUnique + listings findMany +
 * failed-requests count). Promise.all on pgbouncer's transaction
 * pool doesn't parallelise — those three fan out on the same
 * connection with a DEALLOCATE ALL between each, so ~3× one
 * round-trip from Mongolia to Seoul. Folding into one CTE cuts the
 * server-side wall time to a single round-trip.
 *
 * phone_number is deliberately NOT selected: the public profile UI
 * never renders it, so shipping it in the SSR payload was a leak
 * vector for no benefit.
 */

import { prisma } from "@/lib/prisma";
import type { ReviewWithClient } from "@/components/ui/review-item";

export interface PublicProfilePayload {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  is_company: boolean;
  avatar_url: string | null;
  about: string | null;
  created_at: Date;
  role: string;
  avg_rating: number | null;
  reviews_count: number;
  completed_jobs_count: number;
  is_verified: boolean;
}

export interface PublicProfileListing {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  is_negotiable: boolean;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null }[];
  aimag: { name: string } | null;
}

export interface PublicProfileEducation {
  id: string;
  degree: string;
  institution: string;
  field_of_study: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
}

export interface PublicProfileWorkExperience {
  id: string;
  company: string;
  position: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
}

/**
 * Review shape matches ReviewWithClient on the client so
 * <ReviewsList /> can consume it as initialData without coercion.
 * created_at ships as ISO from pg JSON; the page converts to Date
 * at the boundary before passing down.
 */
export interface PublicProfileReview {
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

export interface PublicProfileData {
  profile: PublicProfilePayload | null;
  listings: PublicProfileListing[];
  failedJobsCount: number;
  reviews: ReviewWithClient[];
  reviewsTotal: number;
  educations: PublicProfileEducation[];
  workExperiences: PublicProfileWorkExperience[];
}

interface RawRow {
  profile: (Omit<PublicProfilePayload, "created_at"> & { created_at: string }) | null;
  listings: PublicProfileListing[] | null;
  failed_jobs_count: number | null;
  reviews: PublicProfileReview[] | null;
  reviews_total: number | null;
  educations: PublicProfileEducation[] | null;
  work_experiences: PublicProfileWorkExperience[] | null;
}

export async function fetchPublicProfileData(userId: string): Promise<PublicProfileData> {
  try {
    const rows = await prisma.$queryRaw<RawRow[]>`
      WITH p AS (
        SELECT
          id, first_name, last_name, company_name, is_company,
          avatar_url, about, created_at, role::text AS role,
          avg_rating, reviews_count, completed_jobs_count, is_verified
        FROM profiles
        WHERE id = ${userId}::uuid AND is_deleted = false
        LIMIT 1
      ),
      active_listings AS (
        SELECT jsonb_agg(row ORDER BY created_at DESC) AS data FROM (
          SELECT
            l.id, l.title, l.slug, l.price, l.is_negotiable, l.created_at,
            CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', c.id, 'name', c.name, 'slug', c.slug
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
          LEFT JOIN aimags a     ON a.id = l.aimag_id
          WHERE l.user_id = ${userId}::uuid
            AND l.status = 'active'
            AND l.is_active = true
          ORDER BY l.created_at DESC
          LIMIT 12
        ) row
      ),
      failed AS (
        -- Same aggregate the old unstable_cache block computed, now
        -- part of the same round-trip. Covered by the composite
        -- index on listing_requests (provider_id, status).
        SELECT COUNT(*)::int AS n
        FROM listing_requests
        WHERE provider_id = ${userId}::uuid
          AND status IN ('rejected', 'cancelled_by_provider')
      ),
      rev AS (
        -- First page of reviews about this provider, shape-compatible
        -- with ReviewWithClient so <ReviewsList /> can use it as its
        -- React Query initialData. PAGE_SIZE=10 matches the client.
        SELECT jsonb_agg(row ORDER BY created_at DESC) AS data FROM (
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
          LEFT JOIN profiles cp ON cp.id = r.client_id
          WHERE r.provider_id = ${userId}::uuid
          ORDER BY r.created_at DESC
          LIMIT 10
        ) row
      ),
      rev_total AS (
        SELECT COUNT(*)::int AS n FROM reviews WHERE provider_id = ${userId}::uuid
      ),
      edu AS (
        -- Same ordering my-profile-client uses: current first, then
        -- by start_date desc. Covered by composite index on
        -- profiles_educations (user_id, is_current, start_date DESC).
        -- Chronological timeline: old → new. is_current items always
        -- anchor the "сейчас" end regardless of their start_date, so
        -- the active row visually sits at the bottom. Matches the
        -- sort used by /account/me (my-profile-client).
        SELECT jsonb_agg(row ORDER BY is_current ASC, start_date ASC) AS data FROM (
          SELECT
            e.id, e.degree, e.institution, e.field_of_study,
            e.start_date, e.end_date, e.is_current
          FROM profiles_educations e
          WHERE e.user_id = ${userId}::uuid
        ) row
      ),
      work AS (
        -- Chronological timeline: old → new. is_current items always
        -- anchor the "сейчас" end regardless of their start_date, so
        -- the active row visually sits at the bottom. Matches the
        -- sort used by /account/me (my-profile-client).
        SELECT jsonb_agg(row ORDER BY is_current ASC, start_date ASC) AS data FROM (
          SELECT
            w.id, w.company, w.position,
            w.start_date, w.end_date, w.is_current
          FROM profiles_work_experiences w
          WHERE w.user_id = ${userId}::uuid
        ) row
      )
      SELECT
        (SELECT to_jsonb(p.*) FROM p) AS profile,
        COALESCE((SELECT data FROM active_listings), '[]'::jsonb) AS listings,
        (SELECT n FROM failed) AS failed_jobs_count,
        COALESCE((SELECT data FROM rev), '[]'::jsonb) AS reviews,
        (SELECT n FROM rev_total) AS reviews_total,
        COALESCE((SELECT data FROM edu), '[]'::jsonb) AS educations,
        COALESCE((SELECT data FROM work), '[]'::jsonb) AS work_experiences
    `;

    const row = rows[0];
    if (!row || !row.profile) {
      return {
        profile: null,
        listings: [],
        failedJobsCount: 0,
        reviews: [],
        reviewsTotal: 0,
        educations: [],
        workExperiences: [],
      };
    }

    return {
      profile: {
        ...row.profile,
        created_at: new Date(row.profile.created_at),
        avg_rating: row.profile.avg_rating != null ? Number(row.profile.avg_rating) : null,
      },
      listings: (row.listings ?? []).map((l) => ({
        ...l,
        price: l.price != null ? Number(l.price) : null,
      })),
      failedJobsCount: Number(row.failed_jobs_count ?? 0),
      // Coerce review.created_at ISO → Date here so callers feed
      // <ReviewsList initialReviews={...}> directly without extra
      // mapping. unstable_cache will serialise back to ISO on the
      // way into the Data Cache and we re-hydrate once per request.
      reviews: (row.reviews ?? []).map((r) => ({
        ...r,
        created_at: new Date(r.created_at),
      })),
      reviewsTotal: Number(row.reviews_total ?? 0),
      // Dates come back as ISO strings; the client formats them via
      // formatWorkDate which expects YYYY-MM, so we keep them as
      // strings and slice on the render side.
      educations: row.educations ?? [],
      workExperiences: row.work_experiences ?? [],
    };
  } catch (error) {
    console.error("fetchPublicProfileData failed:", error);
    return {
      profile: null,
      listings: [],
      failedJobsCount: 0,
      reviews: [],
      reviewsTotal: 0,
      educations: [],
      workExperiences: [],
    };
  }
}
