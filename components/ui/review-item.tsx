"use client";

import * as React from "react";
import Image from "next/image";
import { StarRating } from "./star-rating";

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

interface ReviewItemProps {
  review: ReviewWithClient;
}

export const ReviewItem = React.memo(function ReviewItem({ review }: ReviewItemProps) {
  const reviewerName = review.client.is_company
    ? review.client.company_name || "Компани"
    : [review.client.first_name, review.client.last_name].filter(Boolean).join(" ") || "Хэрэглэгч";

  const formattedDate = new Date(review.created_at).toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-start gap-3">
        {review.client.avatar_url ? (
          <Image
            src={review.client.avatar_url}
            alt={reviewerName}
            width={36}
            height={36}
            unoptimized={review.client.avatar_url.includes("dicebear")}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
            {reviewerName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">{reviewerName}</span>
            <span className="text-xs text-muted-foreground shrink-0">{formattedDate}</span>
          </div>
          <StarRating rating={review.rating} size="sm" />
          {review.comment && (
            <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{review.comment}</p>
          )}
        </div>
      </div>
    </div>
  );
});
