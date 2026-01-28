import { prisma } from "@/lib/prisma";
import { ServicesListClient } from "@/components/services-list-client";
import type { ListingWithRelations } from "@/components/listing-card";

// SSR на каждый запрос
export const dynamic = 'force-dynamic';

// Загрузка данных на сервере
// Оптимизация: параллельные запросы с Promise.all (вместо последовательных)
async function getServicesData() {
  const PAGE_SIZE = 12;

  // Параллельно загружаем объявления и считаем общее количество
  const [listingsData, totalCount] = await Promise.all([
    prisma.listings.findMany({
      where: {
        status: "active",
        is_active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
            company_name: true,
            is_company: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { is_cover: true },
          select: {
            id: true,
            url: true,
            sort_order: true,
            is_cover: true,
          },
          take: 1,
        },
        aimag: {
          select: { id: true, name: true, latitude: true, longitude: true },
        },
        district: {
          select: { id: true, name: true, latitude: true, longitude: true },
        },
        khoroo: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.listings.count({
      where: {
        status: "active",
        is_active: true,
      },
    }),
  ]);

  // Сериализуем Decimal в number для Client Components
  const serializedListings = listingsData.map((listing) => ({
    ...listing,
    price: listing.price ? Number(listing.price) : null,
    latitude: listing.latitude ? Number(listing.latitude) : null,
    longitude: listing.longitude ? Number(listing.longitude) : null,
    aimag: listing.aimag ? {
      ...listing.aimag,
      latitude: listing.aimag.latitude ? Number(listing.aimag.latitude) : null,
      longitude: listing.aimag.longitude ? Number(listing.aimag.longitude) : null,
    } : null,
    district: listing.district ? {
      ...listing.district,
      latitude: listing.district.latitude ? Number(listing.district.latitude) : null,
      longitude: listing.district.longitude ? Number(listing.district.longitude) : null,
    } : null,
  }));

  return {
    listings: serializedListings as ListingWithRelations[],
    totalCount,
  };
}

export default async function ServicesPage() {
  const { listings, totalCount } = await getServicesData();

  return (
    <ServicesListClient
      initialListings={listings}
      initialTotalCount={totalCount}
    />
  );
}
