import { ServicesListClient } from "@/components/services-list-client";
import { fetchServices, fetchServicesReferenceData, parseFilters } from "@/lib/services/query";
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

// ISR: 60s revalidation
export const revalidate = 60;

export default async function ServicesPage({
  searchParams,
}: {
  // Next.js 16 passes searchParams as a Promise.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  // Run the listings CTE and the reference-data CTE in parallel. The
  // latter feeds the filter UI (CitySelect, CategoryFilterModal) so it
  // doesn't need to issue its own client-side findMany on mount —
  // when the URL already pins an aimag we seed its districts too, so
  // the aimag's sub-list is ready without a third round-trip.
  const [{ listings, boostedIds, nextCursor }, referenceData] = await Promise.all([
    fetchServices(filters),
    fetchServicesReferenceData(filters.aimagId || undefined),
  ]);

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
