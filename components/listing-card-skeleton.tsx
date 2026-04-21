"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for ListingCard — mirrors the current structure:
 * square image + content block with category label, title, price, provider, location.
 */
export function ListingCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden ring-1 ring-border">
      {/* Image — square */}
      <div className="aspect-square relative overflow-hidden bg-muted">
        <Skeleton className="absolute inset-0" />
        {/* Like button placeholder */}
        <div className="absolute top-3 right-3">
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 md:p-4 space-y-2">
        {/* Category micro-label */}
        <Skeleton className="h-3 w-16" />
        {/* Title — 2 lines */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 md:h-4.5 w-full" />
          <Skeleton className="h-4 md:h-4.5 w-4/5" />
        </div>
        {/* Price */}
        <Skeleton className="h-6 md:h-7 w-24" />

        {/* Divider + provider row */}
        <div className="flex items-center justify-between pt-3.5 border-t border-border">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-3 w-6" />
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="w-3 h-3 rounded" />
          <Skeleton className="h-3 w-32" />
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
