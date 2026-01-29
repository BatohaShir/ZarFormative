"use client";

import * as React from "react";
import Image from "next/image";
import { StarRating } from "./star-rating";
import { cn } from "@/lib/utils";

export interface ReviewWithClient {
  id: string;
  rating: number;
  comment: string | null;
  created_at: Date;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    is_company: boolean;
    company_name: string | null;
  };
}

export interface ReviewItemProps {
  review: ReviewWithClient;
  compact?: boolean;
  className?: string;
}

export const ReviewItem = React.memo(function ReviewItem({ review, compact = false, className }: ReviewItemProps) {
  const reviewerName = review.client.is_company
    ? review.client.company_name || "Компани"
    : [review.client.first_name, review.client.last_name].filter(Boolean).join(" ") || "Хэрэглэгч";

  const formattedDate = new Date(review.created_at).toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className={cn("p-3 bg-background", className)}>
      <div className="flex items-start gap-3">
        {review.client.avatar_url ? (
          <Image
            src={review.client.avatar_url}
            alt={reviewerName}
            width={compact ? 36 : 40}
            height={compact ? 36 : 40}
            unoptimized={review.client.avatar_url.includes("dicebear")}
            className={cn(
              "rounded-full object-cover ring-2 ring-background",
              compact ? "w-9 h-9" : "w-10 h-10"
            )}
          />
        ) : (
          <div className={cn(
            "rounded-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-medium text-primary",
            compact ? "w-9 h-9" : "w-10 h-10"
          )}>
            {reviewerName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("font-medium truncate", compact ? "text-sm" : "text-sm")}>{reviewerName}</span>
            <span className="text-xs text-muted-foreground shrink-0">{formattedDate}</span>
          </div>
          <StarRating rating={review.rating} size="sm" />
          {review.comment && (
            <p className={cn(
              "text-muted-foreground mt-1.5 whitespace-pre-wrap",
              compact ? "text-xs" : "text-sm"
            )}>{review.comment}</p>
          )}
        </div>
      </div>
    </div>
  );
});
