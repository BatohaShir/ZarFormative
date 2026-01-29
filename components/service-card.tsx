"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ThumbsUp, ThumbsDown, Heart, MapPin } from "lucide-react";
import { useFavorites } from "@/contexts/favorites-context";
import { useAuth } from "@/contexts/auth-context";

interface ServiceCardProps {
  service: {
    id: number | string;
    title: string;
    description: string;
    price: string;
    category: string;
    city: string;
    provider: string;
    providerAvatar: string;
    providerId?: string;
    rating: number;
    likes: number;
    successful: number;
    failed: number;
    image: string;
  };
}

export const ServiceCard = React.memo(function ServiceCard({
  service,
}: ServiceCardProps) {
  const { toggleFavorite, isFavorite, isToggling } = useFavorites();
  const { user } = useAuth();
  const isOwnListing = service.providerId ? user?.id === service.providerId : false;
  // Преобразуем id в строку для совместимости с новым API
  const serviceId = String(service.id);
  const isLiked = isFavorite(serviceId);

  // Используем ref для isToggling чтобы избежать пересоздания callback
  const isTogglingRef = React.useRef(isToggling);
  isTogglingRef.current = isToggling;

  const handleLike = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isTogglingRef.current) {
        toggleFavorite(serviceId);
      }
    },
    [toggleFavorite, serviceId]
  );

  return (
    <Link
      href={`/services/${service.id}`}
      className="cursor-pointer group relative bg-card rounded-xl md:rounded-2xl overflow-hidden border hover:border-primary/30 hover:shadow-xl transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-4/3 relative overflow-hidden">
        <Image
          src={service.image}
          alt={service.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute top-2 left-2 md:top-3 md:left-3 text-[10px] md:text-[11px] bg-white/95 dark:bg-black/80 text-foreground px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium shadow-sm">
          {service.category}
        </span>
        {/* Like button on image - hidden for own listings */}
        {!isOwnListing && (
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
        )}
        <div className="absolute bottom-2 left-2 right-2 md:bottom-3 md:left-3 md:right-3">
          <p className="text-white font-bold text-base md:text-lg drop-shadow-lg">
            {service.price}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        <h4 className="font-semibold text-xs md:text-sm line-clamp-1">
          {service.title}
        </h4>
        <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 mt-0.5 md:mt-1">
          {service.description}
        </p>

        {/* Provider - stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Image
              src={service.providerAvatar}
              alt={service.provider}
              width={20}
              height={20}
              className="rounded-full object-cover w-4 h-4 md:w-5 md:h-5"
            />
            <span className="text-[10px] md:text-xs text-primary font-medium line-clamp-1">
              {service.provider}
            </span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 md:w-3 md:h-3 fill-yellow-400 text-yellow-400" />
              {service.rating}
            </span>
            <span className="flex items-center gap-0.5 text-pink-500">
              <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 fill-current" />
              {service.likes + (isLiked ? 1 : 0)}
            </span>
            <span className="flex items-center gap-0.5 text-green-500">
              <ThumbsUp className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {service.successful}
            </span>
            <span className="flex items-center gap-0.5 text-red-500">
              <ThumbsDown className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {service.failed}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1.5 md:mt-2 text-muted-foreground">
          <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
          <span className="text-[10px] md:text-[11px]">{service.city}</span>
        </div>
      </div>
    </Link>
  );
});
