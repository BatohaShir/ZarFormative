import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ListingCard, type ListingWithRelations } from "@/components/listing-card";

interface RecommendedListingsSSRProps {
  listings: ListingWithRelations[];
  boostedIds?: string[];
}

export async function RecommendedListingsSSR({
  listings,
  boostedIds = [],
}: RecommendedListingsSSRProps) {
  const t = await getTranslations("home");
  const hasListings = listings && listings.length > 0;
  const boostedSet = new Set(boostedIds);
  const vipListings = listings.filter((l) => boostedSet.has(l.id));
  const regularListings = listings.filter((l) => !boostedSet.has(l.id));

  if (!hasListings) {
    return (
      <section className="container mx-auto px-4 md:px-6 py-8 md:py-14">
        <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-6 md:mb-8">
          {t("recommendedTitle")}
        </h2>
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-muted/40">
          <Image
            src="/icons/7486744.webp"
            alt=""
            width={72}
            height={72}
            className="mb-4 opacity-50"
          />
          <p className="font-display text-lg font-semibold">{t("emptyTitle")}</p>
          <p className="text-muted-foreground text-sm mt-1">{t("emptySubtitle")}</p>
          <Link href="/services/create" className="mt-5">
            <Button>{t("postAd")}</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 md:px-6 py-8 md:py-14">
      <div className="flex items-end justify-between mb-6 md:mb-8">
        <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
          {t("recommendedTitle")}
        </h2>
        <Link
          href="/services"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{t("viewAll")}</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {vipListings.length > 0 && (
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-6 h-px bg-brand" />
            <span className="text-[11px] uppercase tracking-widest font-semibold text-brand">
              {t("featuredLabel")}
            </span>
          </div>
          <div className="stagger grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {vipListings.map((listing, i) => (
              <div key={listing.id} style={{ ["--i" as string]: i }}>
                <ListingCard listing={listing} priority isVip />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stagger grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
        {regularListings.map((listing, index) => (
          <div key={listing.id} style={{ ["--i" as string]: index }}>
            <ListingCard listing={listing} priority={vipListings.length === 0 && index < 4} />
          </div>
        ))}
      </div>
    </section>
  );
}
