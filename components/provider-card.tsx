"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Clock, UserCircle } from "lucide-react";
import { RequestFormLazy } from "@/components/request-form-lazy";
import { ReviewsList } from "@/components/reviews-list";
import type { ReviewWithClient } from "@/components/ui/review-item";
import { VerifiedBadge } from "@/components/verified-badge";

interface ProviderUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  is_company: boolean;
  is_verified: boolean;
  created_at: Date;
}

interface ProviderCardProps {
  listingId: string;
  listingTitle: string;
  user: ProviderUser;
  providerName: string;
  memberSince: string;
  isOwnListing: boolean;
  variant: "desktop" | "mobile";
  serviceType?: "on_site" | "remote";
  /**
   * SSR-seeded reviews piped through to the embedded ReviewsList
   * so the desktop sidebar paints with the review section already
   * populated — no mount-time findMany + count round-trips.
   */
  initialReviews?: ReviewWithClient[];
  initialReviewsTotal?: number;
}

export const ProviderCard = React.memo(function ProviderCard({
  listingId,
  listingTitle,
  user,
  providerName,
  memberSince,
  isOwnListing,
  variant,
  serviceType = "on_site",
  initialReviews,
  initialReviewsTotal,
}: ProviderCardProps) {
  const isDesktop = variant === "desktop";
  const avatarSize = isDesktop ? 64 : 48;

  return (
    <div
      className={`bg-card ring-1 ring-border ${
        isDesktop ? "rounded-2xl p-5 md:p-6 space-y-4" : "rounded-2xl p-4 space-y-3"
      }`}
    >
      <div className={`flex items-center ${isDesktop ? "gap-4" : "gap-3"}`}>
        <div className="relative shrink-0">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={providerName}
              width={avatarSize}
              height={avatarSize}
              unoptimized={user.avatar_url.includes("dicebear")}
              className={`rounded-full object-cover ring-1 ring-border ${
                isDesktop ? "w-16 h-16" : "w-12 h-12"
              }`}
            />
          ) : (
            <div
              className={`${
                isDesktop ? "w-16 h-16 text-xl" : "w-12 h-12 text-lg"
              } rounded-full bg-muted ring-1 ring-border flex items-center justify-center font-display font-semibold text-foreground`}
            >
              {providerName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={`font-display font-semibold tracking-tight inline-flex items-center gap-1.5 ${
              isDesktop ? "text-base md:text-lg" : "text-sm"
            }`}
          >
            <span className="truncate">{providerName}</span>
            <VerifiedBadge verified={user.is_verified} size={isDesktop ? "md" : "sm"} />
          </h3>
          <div
            className={`flex items-center gap-1.5 text-muted-foreground mt-0.5 ${
              isDesktop ? "text-sm" : "text-xs"
            }`}
          >
            <Clock className={isDesktop ? "h-3.5 w-3.5" : "h-3 w-3"} />
            <span className="tabular">
              {memberSince} оноос хойш{isDesktop && " гишүүн"}
            </span>
          </div>
        </div>
      </div>

      {isDesktop ? (
        <div className="space-y-2 pt-1">
          {!isOwnListing && (
            <RequestFormLazy
              listingId={listingId}
              listingTitle={listingTitle}
              providerId={user.id}
              providerName={providerName}
              serviceType={serviceType}
            />
          )}
          {!isOwnListing && (
            <Link href={`/account/${user.id}`} className="block">
              <Button variant="outline" className="w-full rounded-full" size="lg">
                <UserCircle className="h-4 w-4 mr-2" />
                Профиль харах
              </Button>
            </Link>
          )}
        </div>
      ) : (
        !isOwnListing && (
          <Link href={`/account/${user.id}`} className="block">
            <Button variant="outline" className="w-full rounded-full" size="sm">
              <UserCircle className="h-4 w-4 mr-2" />
              Профиль харах
            </Button>
          </Link>
        )
      )}

      {isDesktop && (
        <ReviewsList
          listingId={listingId}
          variant="desktop"
          initialReviews={initialReviews}
          initialTotal={initialReviewsTotal}
        />
      )}
    </div>
  );
});
