import { ServicesListClient } from "@/components/services-list-client";
import { fetchServices, parseFilters } from "@/lib/services/query";
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
  // Same CTE the /api/services route uses for client-side refetches, so
  // SSR and client paths can never render different data for the same URL.
  const { listings, boostedIds, nextCursor } = await fetchServices(filters);

  return (
    <ServicesListClient
      initialListings={listings}
      initialBoostedIds={boostedIds}
      initialFilters={filters}
      initialNextCursor={nextCursor}
    />
  );
}
