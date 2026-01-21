import { prisma } from "@/lib/prisma";
import { ServicesListClient } from "@/components/services-list-client";
import type { ListingWithRelations } from "@/components/listing-card";

// SSR на каждый запрос
export const dynamic = 'force-dynamic';

// Загрузка данных на сервере
async function getServicesData() {
  const PAGE_SIZE = 12;

  // Параллельно загружаем первую страницу объявлений и общее количество
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
          where: {
            is_cover: true,
          },
          select: {
            id: true,
            url: true,
            sort_order: true,
            is_cover: true,
          },
          take: 1,
        },
        aimag: {
          select: {
            id: true,
            name: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
        khoroo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
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
