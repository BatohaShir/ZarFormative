"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, Eye } from "lucide-react";
import { useFavorites } from "@/contexts/favorites-context";
import type { listings, profiles, categories, listings_images } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Тип объявления с включёнными связями
export type ListingWithRelations = listings & {
  user: Pick<profiles, "id" | "first_name" | "last_name" | "avatar_url" | "company_name" | "is_company">;
  category: Pick<categories, "id" | "name" | "slug">;
  images: Pick<listings_images, "id" | "url" | "sort_order">[];
};

interface ListingCardProps {
  listing: ListingWithRelations;
}

// Форматирование цены
function formatPrice(price: Decimal | null, currency: string, isNegotiable: boolean): string {
  if (isNegotiable) return "Тохиролцоно";
  if (!price) return "Үнэгүй";

  const numPrice = Number(price);
  const formatted = new Intl.NumberFormat("mn-MN").format(numPrice);

  if (currency === "MNT") {
    return `${formatted}₮`;
  }
  return `$${formatted}`;
}

// Получить имя провайдера
function getProviderName(user: ListingWithRelations["user"]): string {
  if (user.is_company && user.company_name) {
    return user.company_name;
  }
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ");
  }
  return "Хэрэглэгч";
}

// Получить URL первого изображения
function getFirstImageUrl(images: ListingWithRelations["images"]): string {
  if (images.length === 0) {
    return "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=300&fit=crop";
  }
  // Сортируем по sort_order и берём первое
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0].url;
}

export const ListingCard = React.memo(function ListingCard({
  listing,
}: ListingCardProps) {
  const { toggleFavorite, isFavorite } = useFavorites();
  // Используем числовой хеш от id для совместимости с текущим контекстом избранного
  const numericId = Math.abs(listing.id.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0));
  const isLiked = isFavorite(numericId);

  const handleLike = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(numericId);
    },
    [toggleFavorite, numericId]
  );

  const providerName = getProviderName(listing.user);
  const imageUrl = getFirstImageUrl(listing.images);
  const priceDisplay = formatPrice(listing.price, listing.currency, listing.is_negotiable);

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
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute top-2 left-2 md:top-3 md:left-3 text-[10px] md:text-[11px] bg-white/95 dark:bg-black/80 text-foreground px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium shadow-sm">
          {listing.category.name}
        </span>
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
              {isLiked ? 1 : 0}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1.5 md:mt-2 text-muted-foreground">
          <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
          <span className="text-[10px] md:text-[11px]">
            {listing.district ? `${listing.city}, ${listing.district}` : listing.city}
          </span>
        </div>
      </div>
    </Link>
  );
});
