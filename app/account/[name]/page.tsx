import { notFound } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { PublicProfileClient } from "./public-profile-client";
import { fetchPublicProfileData, type PublicProfileData } from "@/lib/profile/public-profile-query";
import { safeJsonLd } from "@/lib/json-ld";

// Per-user cache (5 min). Overrides the page-level revalidate: 300
// only when listings change within the window; tag-based invalidation
// (`profile:<id>`) from server actions bypasses the TTL.
export const revalidate = 300;

interface PageProps {
  params: Promise<{ name: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tsogts.mn";

/**
 * Two-layer caching, same pattern as /services/[slug]:
 *
 *   * unstable_cache(userId) — Next Data Cache, 5 min TTL, tagged
 *     `profile:<userId>` so a profile edit / new listing can bust
 *     just that slot.
 *   * React.cache() — in-request memo so generateMetadata() and the
 *     page body share one DB round-trip, and the Date → string →
 *     Date coercion only runs once per request.
 */
const getPublicProfileData = cache(async (userId: string): Promise<PublicProfileData> => {
  const cached = unstable_cache(
    () => fetchPublicProfileData(userId),
    ["public-profile-data", userId],
    { revalidate: 300, tags: [`profile:${userId}`] }
  );
  const data = await cached();
  if (!data.profile) return data;

  // unstable_cache JSON-serialises its payload so Date instances
  // come back as strings. Revive them here so the client types
  // stay honest.
  return {
    ...data,
    profile: {
      ...data.profile,
      created_at: new Date(data.profile.created_at),
    },
    reviews: data.reviews.map((r) => ({
      ...r,
      created_at: new Date(r.created_at),
    })),
  };
});

function providerLabelOf(profile: NonNullable<PublicProfileData["profile"]>): string {
  if (profile.is_company) return profile.company_name || "Компани";
  const full = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  return full || "Хэрэглэгч";
}

/**
 * Real OG/Twitter metadata so a pasted profile link renders with the
 * user's name, description and avatar instead of the site-wide
 * fallback. Reuses the same cached data fetch as the page body.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  if (!UUID_RE.test(name)) return {};

  const { profile } = await getPublicProfileData(name);
  if (!profile) return {};

  const label = providerLabelOf(profile);
  const about =
    profile.about?.trim() ||
    (profile.is_company
      ? `${label} — Tsogts.mn дээрх байгууллагын үйлчилгээнүүд.`
      : `${label} — Tsogts.mn дээрх хувь хүний үйлчилгээнүүд.`);
  const url = `${SITE_URL}/account/${profile.id}`;
  const images = profile.avatar_url ? [{ url: profile.avatar_url, alt: label }] : undefined;

  return {
    title: label,
    description: about.length > 160 ? `${about.slice(0, 157)}...` : about,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      locale: "mn_MN",
      url,
      siteName: "Tsogts.mn",
      title: label,
      description: about,
      images,
      firstName: profile.first_name ?? undefined,
      lastName: profile.last_name ?? undefined,
    },
    twitter: {
      card: "summary",
      title: label,
      description: about,
      images: images?.map((i) => i.url),
    },
  };
}

/**
 * schema.org Person / Organization JSON-LD. Search engines and
 * social embeds read this to render rich previews. We inline it
 * server-side so crawlers that don't execute JS still see it.
 *
 * Content is built from DB fields on the server — no user-supplied
 * HTML — so dangerouslySetInnerHTML is safe here. JSON.stringify
 * escapes every string field.
 */
function ProfileJsonLd({ profile }: { profile: NonNullable<PublicProfileData["profile"]> }) {
  const label = providerLabelOf(profile);
  const url = `${SITE_URL}/account/${profile.id}`;
  const aggregateRating =
    profile.reviews_count > 0 && profile.avg_rating != null
      ? {
          "@type": "AggregateRating",
          ratingValue: profile.avg_rating,
          reviewCount: profile.reviews_count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  const jsonLd = profile.is_company
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: label,
        url,
        image: profile.avatar_url || undefined,
        description: profile.about || undefined,
        aggregateRating,
      }
    : {
        "@context": "https://schema.org",
        "@type": "Person",
        name: label,
        givenName: profile.first_name || undefined,
        familyName: profile.last_name || undefined,
        url,
        image: profile.avatar_url || undefined,
        description: profile.about || undefined,
        aggregateRating,
      };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
  );
}

export default async function AccountPage({ params }: PageProps) {
  const { name } = await params;

  if (!UUID_RE.test(name)) {
    notFound();
  }

  const { profile, listings, failedJobsCount, reviews, reviewsTotal, educations, workExperiences } =
    await getPublicProfileData(name);

  if (!profile) {
    notFound();
  }

  return (
    <>
      <ProfileJsonLd profile={profile} />
      <PublicProfileClient
        profile={profile}
        listings={listings}
        stats={{
          rating: profile.avg_rating || 0,
          reviewsCount: profile.reviews_count,
          completedCount: profile.completed_jobs_count,
          failedCount: failedJobsCount,
        }}
        initialReviews={reviews}
        initialReviewsTotal={reviewsTotal}
        educations={educations}
        workExperiences={workExperiences}
      />
    </>
  );
}
