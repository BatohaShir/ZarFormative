"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton для карточки объявления
 * Используется в:
 * - services-list-client.tsx (loading state и infinite loading)
 * - app/services/loading.tsx
 * - Любой другой странице со списком объявлений
 */
export function ListingCardSkeleton() {
  return (
    <div className="bg-card rounded-xl md:rounded-2xl overflow-hidden border">
      {/* Image skeleton with overlays */}
      <div className="aspect-4/3 relative overflow-hidden">
        <Skeleton className="absolute inset-0" />
        {/* Category badge skeleton */}
        <div className="absolute top-2.5 left-2.5 md:top-3 md:left-3">
          <Skeleton className="h-5 md:h-6 w-16 md:w-20 rounded-full" />
        </div>
        {/* Like button skeleton */}
        <div className="absolute top-2.5 right-2.5 md:top-3 md:right-3">
          <Skeleton className="w-8 h-8 md:w-9 md:h-9 rounded-full" />
        </div>
        {/* Price skeleton */}
        <div className="absolute bottom-2.5 left-2.5 md:bottom-3 md:left-3">
          <Skeleton className="h-6 md:h-7 w-24 md:w-28" />
        </div>
      </div>
      {/* Content skeleton */}
      <div className="p-3 md:p-4 space-y-2 md:space-y-2.5">
        {/* Title */}
        <Skeleton className="h-4 md:h-5 w-3/4" />
        {/* Description */}
        <Skeleton className="h-3 md:h-4 w-full" />
        {/* Provider row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 md:w-6 md:h-6 rounded-full" />
            <Skeleton className="h-3 md:h-4 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
        {/* Location */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="w-3.5 h-3.5 rounded" />
          <Skeleton className="h-3 md:h-4 w-32" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid из skeleton карточек
 */
export function ListingCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
