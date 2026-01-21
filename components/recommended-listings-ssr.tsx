import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard, type ListingWithRelations } from "@/components/listing-card";

interface RecommendedListingsSSRProps {
  listings: ListingWithRelations[];
}

export function RecommendedListingsSSR({ listings }: RecommendedListingsSSRProps) {
  const hasListings = listings && listings.length > 0;

  // Если нет объявлений - показываем пустое состояние
  if (!hasListings) {
    return (
      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="text-base md:text-xl font-semibold">Танд зориулсан санал</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Image
            src="/icons/7486744.png"
            alt="Пустая коробка"
            width={80}
            height={80}
            className="mb-4 opacity-70"
          />
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
        {listings.map((listing, index) => (
          <ListingCard key={listing.id} listing={listing} priority={index < 4} />
        ))}
      </div>
    </section>
  );
}
