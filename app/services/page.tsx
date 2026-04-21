import { ServicesListClient } from "@/components/services-list-client";
import { fetchServicesPageData, parseFilters } from "@/lib/services/query";
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

  // One $queryRaw, one DB round-trip. Previously we called
  // fetchServices + fetchServicesReferenceData inside Promise.all
  // thinking they'd parallelise — on pgbouncer transaction mode
  // they actually serialise on the same connection and pay two
  // round-trips. Folded into a single CTE below.
  const { listings, boostedIds, nextCursor, referenceData } = await fetchServicesPageData(filters);

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
