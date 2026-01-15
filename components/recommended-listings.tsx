"use client";

import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard, type ListingWithRelations } from "@/components/listing-card";
import { useFindManylistings } from "@/lib/hooks/listings";

export function RecommendedListings() {
  // Загружаем активные объявления из БД
  const { data: listings, isLoading } = useFindManylistings({
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
        select: {
          id: true,
          url: true,
          sort_order: true,
        },
        orderBy: {
          sort_order: "asc",
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: 8,
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="text-base md:text-xl font-semibold">Танд зориулсан санал</h3>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl md:rounded-2xl overflow-hidden border">
              <Skeleton className="aspect-4/3" />
              <div className="p-3 md:p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center gap-2 mt-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const hasListings = listings && listings.length > 0;

  // Если нет объявлений - не показываем секцию вообще
  if (!hasListings) {
    return (
      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="text-base md:text-xl font-semibold">Танд зориулсан санал</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-sm md:text-base">
            Одоогоор зар байхгүй байна
          </p>
          <p className="text-muted-foreground/70 text-xs md:text-sm mt-1">
            Эхний зараа нэмээрэй!
          </p>
          <Link href="/services/create" className="mt-4">
            <Button>Зар нэмэх</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-xl font-semibold">Танд зориулсан санал</h3>
        <Link href="/services">
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs md:text-sm">
            Бүгдийг харах <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
        {(listings as ListingWithRelations[]).map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}
