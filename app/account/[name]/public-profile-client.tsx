"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { InnerHeader } from "@/components/app-header";
import { Footer } from "@/components/footer";
import { MapPin, Star, CheckCircle, ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { SocialShareButtons } from "@/components/social-share-buttons";
import type { ReviewWithClient } from "@/components/ui/review-item";

// Reviews fire their own REST call from the client; SSR'ing the
// component would block HTML streaming on a round-trip we don't
// need before paint. Lazy-load + seed with initialReviews so the
// section appears populated as soon as the chunk lands.
const ReviewsList = dynamic(() => import("@/components/reviews-list").then((m) => m.ReviewsList), {
  ssr: false,
});

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  is_company: boolean;
  avatar_url: string | null;
  about: string | null;
  created_at: Date;
  role: string;
  avg_rating: number | null;
  reviews_count: number;
  completed_jobs_count: number;
  is_verified: boolean;
}

interface ListingData {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  is_negotiable: boolean;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null }[];
  aimag: { name: string } | null;
}

interface Stats {
  rating: number;
  reviewsCount: number;
  completedCount: number;
  failedCount: number;
}

interface PublicProfileClientProps {
  profile: ProfileData;
  listings: ListingData[];
  stats: Stats;
  /**
   * SSR-seeded first page of this provider's reviews. Piped into
   * <ReviewsList /> so the section renders populated on first paint
   * instead of flashing a loading state while the client hits the
   * reviews endpoint.
   */
  initialReviews?: ReviewWithClient[];
  initialReviewsTotal?: number;
}

export function PublicProfileClient({
  profile,
  listings,
  stats,
  initialReviews,
  initialReviewsTotal,
}: PublicProfileClientProps) {
  const router = useRouter();

  // Single stable callback for hover-prefetching any listing detail.
  // Creating one closure per card (inside .map) would build 12 new
  // functions on every re-render; this version is stable across
  // renders and takes the slug off the event target.
  const prefetchDetail = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement> | React.FocusEvent<HTMLAnchorElement>) => {
      const slug = e.currentTarget.dataset.slug;
      if (slug) router.prefetch(`/services/${slug}`);
    },
    [router]
  );
  // Memoize derivations that only change when `profile` / `stats` do.
  // Without memoization these strings get rebuilt on every re-render
  // triggered by unrelated context updates (theme, auth) — cheap
  // each, but there's no reason to do it.
  const providerName = React.useMemo(
    () =>
      profile.is_company
        ? profile.company_name || "Компани"
        : `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Хэрэглэгч",
    [profile.is_company, profile.company_name, profile.first_name, profile.last_name]
  );

  // profile.created_at always exists (DB default NOW()), so no
  // fallback branch is needed.
  const memberSince = React.useMemo(
    () => new Date(profile.created_at).getFullYear().toString(),
    [profile.created_at]
  );

  // totalServices = completed + failed; successRate is share of
  // completed. If there's no history yet we show "—" instead of the
  // old misleading "100%", which implied the user had a perfect
  // record from zero data points.
  const { totalServices, successRate } = React.useMemo(() => {
    const total = stats.completedCount + stats.failedCount;
    return {
      totalServices: total,
      successRate: total > 0 ? Math.round((stats.completedCount / total) * 100) : null,
    };
  }, [stats.completedCount, stats.failedCount]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Shared header — same markup loading.tsx uses so there's no
          flash when the server data lands and this client takes over. */}
      <InnerHeader />

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Profile Header - Full Width with Gradient */}
        <div className="bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-xl bg-muted">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={providerName}
                    width={160}
                    height={160}
                    unoptimized={profile.avatar_url.includes("dicebear")}
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                    {providerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {profile.role === "admin" && (
                <div className="absolute bottom-2 right-2 bg-blue-500 rounded-full p-1.5 md:p-2 ring-2 ring-white dark:ring-gray-800">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 inline-flex items-center gap-2 flex-wrap justify-center md:justify-start">
                <span>{providerName}</span>
                <VerifiedBadge verified={profile.is_verified} size="lg" />
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-foreground">
                    {stats.rating > 0 ? stats.rating : "-"}
                  </span>
                  <span>({stats.reviewsCount} сэтгэгдэл)</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {memberSince} оноос
                </span>
              </div>

              {/* Stats - Horizontal Pills */}
              <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="font-bold text-lg">{stats.rating > 0 ? stats.rating : "-"}</span>
                  <span className="text-sm text-muted-foreground">
                    Үнэлгээ{stats.reviewsCount > 0 ? ` (${stats.reviewsCount})` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <ThumbsUp className="h-5 w-5 text-green-500" />
                  <span className="font-bold text-lg">{stats.completedCount}</span>
                  <span className="text-sm text-muted-foreground">Амжилттай</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <ThumbsDown className="h-5 w-5 text-red-500" />
                  <span className="font-bold text-lg">{stats.failedCount}</span>
                  <span className="text-sm text-muted-foreground">Амжилтгүй</span>
                </div>
              </div>
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:flex flex-col gap-2">
              <SocialShareButtons title={providerName} description={profile.about || undefined} />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - About & Contact */}
          <div className="lg:col-span-1 space-y-6">
            {/* About Card */}
            {profile.about && (
              <div className="bg-card rounded-xl border p-4 md:p-6">
                <h3 className="font-semibold text-lg mb-4">Тухай</h3>
                <p className="text-muted-foreground leading-relaxed">{profile.about}</p>
              </div>
            )}

            {/* Stats Card */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-lg mb-4">Статистик</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Амжилттай</span>
                  <span className="font-semibold text-green-600">{stats.completedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Амжилтгүй</span>
                  <span className="font-semibold text-red-600">{stats.failedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Амжилтын хувь</span>
                  <span className="font-semibold text-green-600">
                    {successRate != null ? `${successRate}%` : "—"}
                  </span>
                </div>
                {totalServices > 0 && (
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${successRate}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Action Buttons */}
            <div className="lg:hidden">
              <SocialShareButtons title={providerName} description={profile.about || undefined} />
            </div>
          </div>

          {/* Right Column - Services */}
          <div className="lg:col-span-2 space-y-6">
            {/* Services */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-lg mb-4">Үйлчилгээнүүд</h3>
              {listings.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {listings.map((listing, index) => {
                    const coverImage = listing.images?.[0];
                    // Only the first two above-the-fold cards paint
                    // with `priority`; the rest lazy-load via the
                    // browser's default IntersectionObserver. Matches
                    // the pattern used by ListingCard elsewhere.
                    const isPriority = index < 2;
                    // prefetch={null} keeps Next from shipping a dozen
                    // RSC payloads for detail pages on mount; hover /
                    // focus warms the one the user is about to click
                    // via the shared `prefetchDetail` callback.
                    return (
                      <Link
                        key={listing.id}
                        href={`/services/${listing.slug}`}
                        prefetch={null}
                        data-slug={listing.slug}
                        onMouseEnter={prefetchDetail}
                        onFocus={prefetchDetail}
                      >
                        <div className="group border rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                          <div className="aspect-video overflow-hidden bg-muted relative">
                            {coverImage?.url ? (
                              <Image
                                src={coverImage.url}
                                alt={coverImage.alt || listing.title}
                                fill
                                sizes="(max-width: 640px) 100vw, 50vw"
                                priority={isPriority}
                                loading={isPriority ? undefined : "lazy"}
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image
                                  src="/icons/7486744.webp"
                                  alt="No image"
                                  width={48}
                                  height={48}
                                  className="opacity-50"
                                />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            {listing.category && (
                              <span className="text-xs px-2 py-1 bg-muted rounded-full">
                                {listing.category.name}
                              </span>
                            )}
                            <h4 className="font-medium mt-2">{listing.title}</h4>
                            <p className="text-primary font-bold text-lg mt-1">
                              {listing.price?.toLocaleString()}₮
                              {listing.is_negotiable && (
                                <span className="text-sm font-normal text-muted-foreground ml-1">
                                  (тохиролцоно)
                                </span>
                              )}
                            </p>
                            {listing.aimag && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {listing.aimag.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Image
                    src="/icons/7486744.webp"
                    alt="Үйлчилгээ байхгүй"
                    width={64}
                    height={64}
                    className="mx-auto mb-3 opacity-50"
                  />
                  <p>Үйлчилгээ байхгүй байна</p>
                </div>
              )}
            </div>

            {/* Real reviews — ReviewsList scoped by providerId and
                seeded from the SSR CTE, so the section renders fully
                populated on first paint. */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <ReviewsList
                providerId={profile.id}
                variant="mobile"
                initialReviews={initialReviews}
                initialTotal={initialReviewsTotal}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
