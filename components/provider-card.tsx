"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Clock, UserCircle } from "lucide-react";
import { RequestForm } from "@/components/request-form";
import { ReviewsList } from "@/components/reviews-list";

interface ProviderUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  is_company: boolean;
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
}

export const ProviderCard = React.memo(function ProviderCard({
  listingId,
  listingTitle,
  user,
  providerName,
  memberSince,
  isOwnListing,
  variant,
}: ProviderCardProps) {
  const isDesktop = variant === "desktop";
  const avatarSize = isDesktop ? 64 : 48;

  return (
    <div className={`border ${isDesktop ? "rounded-2xl p-6" : "rounded-xl p-4"} space-y-${isDesktop ? "4" : "3"}`}>
      <div className={`flex items-center gap-${isDesktop ? "4" : "3"}`}>
        <div className="relative">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={providerName}
              width={avatarSize}
              height={avatarSize}
              unoptimized={user.avatar_url.includes("dicebear")}
              className="rounded-full object-cover"
            />
          ) : (
            <div
              className={`${isDesktop ? "w-16 h-16 text-xl" : "w-12 h-12 text-lg"} rounded-full bg-primary/20 flex items-center justify-center font-medium text-primary`}
            >
              {providerName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className={isDesktop ? "" : "flex-1"}>
          <h3 className={`font-semibold ${isDesktop ? "" : "text-sm"}`}>{providerName}</h3>
          <div className={`flex items-center gap-${isDesktop ? "2" : "1.5"} text-${isDesktop ? "sm" : "xs"} text-muted-foreground`}>
            <Clock className={`${isDesktop ? "h-4 w-4" : "h-3 w-3"}`} />
            <span>{memberSince} оноос хойш{isDesktop && " гишүүн"}</span>
          </div>
        </div>
      </div>

      {isDesktop ? (
        <div className="space-y-3 pt-2">
          {!isOwnListing && (
            <RequestForm
              listingId={listingId}
              listingTitle={listingTitle}
              providerId={user.id}
              providerName={providerName}
            />
          )}
          {!isOwnListing && (
            <Link href={`/account/${user.id}`}>
              <Button variant="ghost" className="w-full" size="lg">
                <UserCircle className="h-4 w-4 mr-2" />
                Профиль харах
              </Button>
            </Link>
          )}
        </div>
      ) : (
        !isOwnListing && (
          <Link href={`/account/${user.id}`}>
            <Button variant="outline" className="w-full" size="sm">
              <UserCircle className="h-4 w-4 mr-2" />
              Профиль харах
            </Button>
          </Link>
        )
      )}

      {isDesktop && (
        <ReviewsList providerId={user.id} variant="desktop" />
      )}
    </div>
  );
});
