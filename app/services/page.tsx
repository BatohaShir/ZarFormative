import { ServicesListClient } from "@/components/services-list-client";
import { fetchServicesPageData, parseFilters, type ServicesFilters } from "@/lib/services/query";
import { getSelectedAimagCode, ALL_AIMAGS_CODE } from "@/lib/aimag/cookie";
import { getAimagList } from "@/lib/aimag/list";
import { unstable_cache } from "next/cache";
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

// Dynamic — the grid depends on the selected-aimag cookie. ISR would
// serve a stale city view to visitors who just switched.
export const revalidate = 0;

export default async function ServicesPage({
  searchParams,
}: {
  // Next.js 16 passes searchParams as a Promise.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  // If the URL doesn't carry ?aimag= — which is the common case when
  // the user just navigated here from the header — fall back to the
  // cookie set by the site-wide aimag selector. That way the grid
  // honours "my city" without the user having to re-pick it inside
  // the /services filter sidebar.
  //
  // The URL uses UUID (?aimag=<uuid>) while the cookie stores the
  // short code ('UB', 'DU'...). Map code → id via the cached aimag
  // list. 'ALL' means "don't filter" and we leave aimagId empty.
  if (!filters.aimagId) {
    const cookieCode = await getSelectedAimagCode();
    if (cookieCode !== ALL_AIMAGS_CODE) {
      const aimags = await getAimagList();
      const match = aimags.find((a) => a.code === cookieCode);
      if (match) filters.aimagId = match.id;
    }
  }

  const { listings, boostedIds, nextCursor, referenceData } = await getCachedPageData(filters);

  return (
    <ServicesListClient
      initialListings={listings}
      initialBoostedIds={boostedIds}
      initialFilters={filters}
      initialNextCursor={nextCursor}
      initialReferenceData={referenceData}
    />
  );
}

/**
 * Short-TTL cache keyed on the *full* filter object. Two visits in a
 * row with the same aimag/search/category hit the Data Cache slot
 * instead of repaying the CTE. 10s keeps it snappy without serving
 * stale listings after a fresh post.
 *
 * The cache key is a JSON string of the filters so all the discrete
 * options (categories, price range, search, sort, aimag, district)
 * fan out into independent slots without collisions.
 */
async function getCachedPageData(filters: ServicesFilters) {
  const key = JSON.stringify(filters);
  const cached = unstable_cache(
    async () => fetchServicesPageData(filters),
    ["services-page-data", key],
    { revalidate: 10, tags: ["services-page"] }
  );
  return cached();
}
