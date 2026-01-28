"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Heart, MapPin, Eye, User, Navigation } from "lucide-react";
import { useFavorites } from "@/contexts/favorites-context";
import { useAuth } from "@/contexts/auth-context";
import type { listings, profiles, categories, listings_images, aimags, districts, khoroos } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { formatListingPrice } from "@/lib/utils";
import { getProviderName, formatLocation, getFirstImageUrl } from "@/lib/formatters";

// Lazy load map modal
const LocationMapModal = dynamic(
  () => import("@/components/location-map-modal").then((mod) => mod.LocationMapModal),
  { ssr: false }
);

// Тип объявления с включёнными связями
export type ListingWithRelations = listings & {
  user: Pick<profiles, "id" | "first_name" | "last_name" | "avatar_url" | "company_name" | "is_company">;
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
}

export const ListingCard = React.memo(function ListingCard({
  listing,
  priority = false,
}: ListingCardProps) {
  const { toggleFavorite, isFavorite, isToggling } = useFavorites();
  const { user } = useAuth();
  const isLiked = isFavorite(listing.id);
  const isOwnListing = user?.id === listing.user.id;
  const [showMapModal, setShowMapModal] = React.useState(false);

  // Проверяем есть ли координаты для показа на карте
  const hasCoordinates = listing.latitude && listing.longitude;

  // Используем ref для isToggling чтобы избежать пересоздания callback
  const isTogglingRef = React.useRef(isToggling);
  isTogglingRef.current = isToggling;

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

  const handleShowMap = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowMapModal(true);
    },
    []
  );

  const providerName = getProviderName(listing.user);

  // Мемоизация URL изображения - избегаем сортировки на каждый рендер
  const imageUrl = React.useMemo(
    () => getFirstImageUrl(listing.images),
    [listing.images]
  );

  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const locationDisplay = formatLocation(listing);

  return (
    <Link
      href={`/services/${listing.slug}`}
      prefetch={true}
      className="cursor-pointer group relative bg-card rounded-xl md:rounded-2xl overflow-hidden border hover:border-primary/20 hover:shadow-lg transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-4/3 relative overflow-hidden">
        <Image
          src={imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

        {/* Category badge */}
        <div className="absolute top-2.5 left-2.5 md:top-3 md:left-3">
          <span className="text-[10px] md:text-xs bg-white/95 dark:bg-gray-900/90 text-foreground px-2.5 py-1 md:px-3 md:py-1.5 rounded-full font-medium shadow-sm backdrop-blur-sm">
            {listing.category.name}
          </span>
        </div>

        {/* Own listing badge */}
        {isOwnListing && (
          <div className="absolute top-2.5 right-12 md:top-3 md:right-14">
            <span className="text-[10px] md:text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium shadow-sm flex items-center gap-1">
              <User className="w-3 h-3" />
              Миний
            </span>
          </div>
        )}

        {/* Like button */}
        <button
          onClick={handleLike}
          className="absolute top-2.5 right-2.5 md:top-3 md:right-3 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/90 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900 flex items-center justify-center transition-all shadow-sm backdrop-blur-sm hover:scale-110"
        >
          <Heart
            className={`w-4 h-4 md:w-5 md:h-5 transition-all ${
              isLiked
                ? "fill-red-500 text-red-500 scale-110"
                : "text-gray-600 dark:text-gray-300"
            }`}
          />
        </button>

        {/* Price on image */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 md:bottom-3 md:left-3 md:right-3">
          <p className="text-white font-bold text-lg md:text-xl drop-shadow-lg">
            {priceDisplay}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 space-y-2 md:space-y-2.5">
        {/* Title */}
        <h4 className="font-semibold text-sm md:text-base line-clamp-1 group-hover:text-primary transition-colors">
          {listing.title}
        </h4>

        {/* Description */}
        <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
          {listing.description}
        </p>

        {/* Provider row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {listing.user.avatar_url ? (
              <Image
                src={listing.user.avatar_url}
                alt={providerName}
                width={24}
                height={24}
                unoptimized={listing.user.avatar_url.includes("dicebear")}
                className="rounded-full object-cover w-5 h-5 md:w-6 md:h-6 shrink-0 ring-2 ring-primary/20"
              />
            ) : (
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] md:text-xs font-semibold text-primary shrink-0">
                {providerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs md:text-sm text-foreground font-medium truncate">
              {providerName}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 md:gap-3 text-xs text-muted-foreground shrink-0">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {listing.views_count}
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <Heart className="w-3.5 h-3.5 fill-current" />
              {listing.favorites_count + (isLiked ? 1 : 0)}
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
          <span className="text-xs md:text-sm truncate flex-1">
            {locationDisplay}
          </span>
          {hasCoordinates && (
            <button
              onClick={handleShowMap}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors shrink-0"
              title="Газрын зурагт харах"
            >
              <Navigation className="w-3 h-3" />
              <span className="text-[10px] font-medium">Map</span>
            </button>
          )}
        </div>

      </div>

      {/* Map Modal */}
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
