"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Heart, MapPin, Eye, User, Navigation, Crown } from "lucide-react";
import { useFavoriteIds, useFavoriteActions } from "@/contexts/favorites-context";
import { useAuth } from "@/contexts/auth-context";
import type {
  listings,
  profiles,
  categories,
  listings_images,
  aimags,
  districts,
  khoroos,
} from "@prisma/client";
import { formatListingPrice, cn } from "@/lib/utils";
import { getProviderName, formatLocation, getFirstImageUrl } from "@/lib/formatters";

// Lazy load map modal
const LocationMapModal = dynamic(
  () => import("@/components/location-map-modal").then((mod) => mod.LocationMapModal),
  { ssr: false }
);

// Тип объявления с включёнными связями
export type ListingWithRelations = listings & {
  user: Pick<
    profiles,
    "id" | "first_name" | "last_name" | "avatar_url" | "company_name" | "is_company"
  >;
  category: Pick<categories, "id" | "name" | "slug">;
  images: Pick<listings_images, "id" | "url" | "sort_order">[];
  aimag?: Pick<aimags, "id" | "name" | "latitude" | "longitude"> | null;
  district?: Pick<districts, "id" | "name" | "latitude" | "longitude"> | null;
  khoroo?: Pick<khoroos, "id" | "name"> | null;
  duration_minutes?: number | null;
  work_hours_start?: string | null;
  work_hours_end?: string | null;
};

interface ListingCardProps {
  listing: ListingWithRelations;
  /** Prioritize image loading for LCP optimization (first visible cards) */
  priority?: boolean;
  isVip?: boolean;
}

export const ListingCard = React.memo(function ListingCard({
  listing,
  priority = false,
  isVip = false,
}: ListingCardProps) {
  // OPTIMIZATION: Use separate context hooks to avoid re-renders from unrelated context changes
  const { isFavorite } = useFavoriteIds();
  const { toggleFavorite, isToggling } = useFavoriteActions();
  const { user } = useAuth();
  // OPTIMIZATION: Memoize isFavorite check to avoid O(n) search on every render
  const isLiked = React.useMemo(() => isFavorite(listing.id), [isFavorite, listing.id]);
  const isOwnListing = user?.id === listing.user.id;
  const [showMapModal, setShowMapModal] = React.useState(false);

  // Проверяем есть ли координаты для показа на карте
  const hasCoordinates = listing.latitude && listing.longitude;

  // Используем ref для isToggling чтобы избежать пересоздания callback
  const isTogglingRef = React.useRef(isToggling);
  React.useEffect(() => {
    isTogglingRef.current = isToggling;
  }, [isToggling]);

  const handleLike = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isTogglingRef.current) {
        toggleFavorite(listing.id);
      }
    },
    [toggleFavorite, listing.id]
  );

  const handleShowMap = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMapModal(true);
  }, []);

  const providerName = getProviderName(listing.user);

  // Мемоизация URL изображения - избегаем сортировки на каждый рендер
  const imageUrl = React.useMemo(() => getFirstImageUrl(listing.images), [listing.images]);

  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const locationDisplay = formatLocation(listing);

  return (
    <Link
      href={`/services/${listing.slug}`}
      prefetch={null}
      className={cn(
        "group relative block bg-card rounded-2xl overflow-hidden transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]",
        isVip ? "ring-1 ring-brand/40" : "ring-1 ring-border"
      )}
      style={{ transitionTimingFunction: "var(--ease-brand)" }}
    >
      {/* Image — square */}
      <div className="aspect-square relative overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* VIP badge */}
        {isVip && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand text-brand-foreground text-[10px] font-semibold uppercase tracking-wide shadow-sm">
            <Crown className="w-3 h-3" />
            VIP
          </div>
        )}

        {/* Own / Like */}
        {isOwnListing ? (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] bg-foreground/90 text-background px-2 py-1 rounded-full font-medium flex items-center gap-1 backdrop-blur-sm">
              <User className="w-3 h-3" />
              Миний
            </span>
          </div>
        ) : (
          <button
            onClick={handleLike}
            aria-label="Taалагдсан"
            className={cn(
              "absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full transition-all",
              "bg-background/70 backdrop-blur-md hover:bg-background active:scale-90"
            )}
          >
            <Heart
              className={cn(
                "w-4.5 h-4.5 transition-all",
                isLiked ? "fill-brand text-brand scale-110" : "text-foreground"
              )}
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 md:p-4 space-y-2">
        {/* Title + category micro-label */}
        <div className="space-y-1">
          <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide font-medium">
            {listing.category.name}
          </span>
          <h4 className="font-display font-semibold text-[15px] md:text-base leading-snug line-clamp-2">
            {listing.title}
          </h4>
        </div>

        {/* Price — hero of the card */}
        <p className="font-display text-lg md:text-xl font-bold tabular tracking-tight">
          {priceDisplay}
        </p>

        {/* Provider + stats */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border">
          <div className="flex items-center gap-2 min-w-0 flex-1 pt-2">
            {listing.user.avatar_url ? (
              <Image
                src={listing.user.avatar_url}
                alt={providerName}
                width={20}
                height={20}
                unoptimized={listing.user.avatar_url.includes("dicebear")}
                className="rounded-full object-cover w-5 h-5 shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-foreground shrink-0">
                {providerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-muted-foreground truncate">{providerName}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground shrink-0 pt-2 tabular">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {listing.views_count}
            </span>
            <span className="flex items-center gap-1">
              <Heart className={cn("w-3 h-3", isLiked && "fill-brand text-brand")} />
              {listing.favorites_count + (isLiked ? 1 : 0)}
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="text-[11px] md:text-xs truncate flex-1">{locationDisplay}</span>
          {hasCoordinates && (
            <button
              onClick={handleShowMap}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-muted text-foreground transition-colors shrink-0"
              title="Газрын зурагт харах"
            >
              <Navigation className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {showMapModal && hasCoordinates && (
        <LocationMapModal
          coordinates={[Number(listing.latitude), Number(listing.longitude)]}
          address={locationDisplay}
          title={listing.title}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </Link>
  );
});
