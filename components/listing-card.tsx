"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, Eye, Clock, CalendarClock, User } from "lucide-react";
import { useFavorites } from "@/contexts/favorites-context";
import { useAuth } from "@/contexts/auth-context";
import type { listings, profiles, categories, listings_images, aimags, districts, khoroos } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { formatListingPrice } from "@/lib/utils";
import { getProviderName, formatLocation, getFirstImageUrl } from "@/lib/formatters";

// Тип объявления с включёнными связями
export type ListingWithRelations = listings & {
  user: Pick<profiles, "id" | "first_name" | "last_name" | "avatar_url" | "company_name" | "is_company">;
  category: Pick<categories, "id" | "name" | "slug">;
  images: Pick<listings_images, "id" | "url" | "sort_order">[];
  aimag?: Pick<aimags, "id" | "name"> | null;
  district?: Pick<districts, "id" | "name"> | null;
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
      className="cursor-pointer group relative bg-card rounded-xl md:rounded-2xl overflow-hidden border hover:border-primary/30 hover:shadow-xl transition-all duration-300"
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
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 md:top-3 md:left-3 flex items-center gap-1.5">
          <span className="text-[10px] md:text-[11px] bg-white/95 dark:bg-black/80 text-foreground px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium shadow-sm">
            {listing.category.name}
          </span>
          {isOwnListing && (
            <span className="text-[10px] md:text-[11px] bg-primary text-primary-foreground px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium shadow-sm flex items-center gap-1">
              <User className="w-2.5 h-2.5 md:w-3 md:h-3" />
              Миний
            </span>
          )}
        </div>
        {/* Like button on image */}
        <button
          onClick={handleLike}
          className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 md:p-2 rounded-full bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black transition-colors shadow-sm"
        >
          <Heart
            className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${
              isLiked
                ? "fill-pink-500 text-pink-500"
                : "text-gray-600 dark:text-gray-300"
            }`}
          />
        </button>
        <div className="absolute bottom-2 left-2 right-2 md:bottom-3 md:left-3 md:right-3">
          <p className="text-white font-bold text-base md:text-lg drop-shadow-lg">
            {priceDisplay}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        <h4 className="font-semibold text-xs md:text-sm line-clamp-1">
          {listing.title}
        </h4>
        <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 mt-0.5 md:mt-1">
          {listing.description}
        </p>

        {/* Provider */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 md:gap-2">
            {listing.user.avatar_url ? (
              <Image
                src={listing.user.avatar_url}
                alt={providerName}
                width={20}
                height={20}
                unoptimized={listing.user.avatar_url.includes("dicebear")}
                className="rounded-full object-cover w-4 h-4 md:w-5 md:h-5"
              />
            ) : (
              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] md:text-[10px] font-medium text-primary">
                {providerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[10px] md:text-xs text-primary font-medium line-clamp-1">
              {providerName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {listing.views_count}
            </span>
            <span className="flex items-center gap-0.5 text-pink-500">
              <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 fill-current" />
              {listing.favorites_count + (isLiked ? 1 : 0)}
            </span>
          </div>
        </div>
        {/* Location */}
        <div className="flex items-center gap-1 mt-1.5 md:mt-2 text-muted-foreground">
          <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
          <span className="text-[10px] md:text-[11px] line-clamp-1">
            {locationDisplay}
          </span>
        </div>

        {/* Duration and Work Hours */}
        {(listing.duration_minutes || listing.work_hours_start) && (
          <div className="flex items-center flex-wrap gap-2 md:gap-3 mt-1.5 md:mt-2 text-muted-foreground">
            {listing.duration_minutes && (
              <span className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-[11px]">
                <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" />
                {listing.duration_minutes < 60
                  ? `${listing.duration_minutes} мин`
                  : listing.duration_minutes % 60 === 0
                    ? `${Math.floor(listing.duration_minutes / 60)} цаг`
                    : `${Math.floor(listing.duration_minutes / 60)} ц ${listing.duration_minutes % 60} мин`}
              </span>
            )}
            {listing.work_hours_start && listing.work_hours_end && (
              <span className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-[11px]">
                <CalendarClock className="w-2.5 h-2.5 md:w-3 md:h-3 text-indigo-500" />
                {listing.work_hours_start} - {listing.work_hours_end}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
});
