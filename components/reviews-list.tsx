"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { ReviewItem, type ReviewWithClient } from "@/components/ui/review-item";
import { useFindManyreviews } from "@/lib/hooks/reviews";

interface ReviewsListProps {
  providerId: string;
  variant: "desktop" | "mobile";
}

export const ReviewsList = React.memo(function ReviewsList({
  providerId,
  variant
}: ReviewsListProps) {
  // OPTIMIZATION: Добавлен кэш для отзывов - они редко меняются
  const { data: reviews, isLoading } = useFindManyreviews(
    {
      where: { provider_id: providerId },
      include: {
        client: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
            is_company: true,
            company_name: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 10,
    },
    {
      staleTime: 5 * 60 * 1000, // 5 минут - отзывы редко меняются
      gcTime: 10 * 60 * 1000,   // 10 минут в кэше
    }
  );

  const isDesktop = variant === "desktop";
  const reviewCount = reviews?.length || 0;

  // Calculate average rating
  const averageRating = React.useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  if (isLoading) {
    return (
      <div className={`${isDesktop ? "border-t pt-4 mt-4" : ""} space-y-3`}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className={`${isDesktop ? "border-t pt-4 mt-4" : ""} space-y-3`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold ${isDesktop ? "text-sm" : "text-base"} flex items-center gap-2`}>
          <MessageSquare className="h-4 w-4" />
          Сэтгэгдэл ({reviewCount})
        </h3>
        {reviewCount > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={Math.round(averageRating)} size="sm" />
            <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {reviewCount === 0 ? (
        <div className={`text-center ${isDesktop ? "py-6" : "py-8"} bg-muted/30 rounded-lg`}>
          <MessageSquare className={`${isDesktop ? "h-10 w-10" : "h-12 w-12"} mx-auto mb-2 text-muted-foreground/40`} />
          <p className={`${isDesktop ? "text-xs" : "text-sm"} text-muted-foreground`}>
            Одоогоор сэтгэгдэл байхгүй байна
          </p>
        </div>
      ) : (
        <div className="bg-muted/30 rounded-lg px-3">
          {(reviews as ReviewWithClient[]).map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
});
