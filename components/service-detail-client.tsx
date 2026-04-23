"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavoriteIds, useFavoriteActions } from "@/contexts/favorites-context";
import { useAuth } from "@/contexts/auth-context";
import { RequestFormLazy } from "@/components/request-form-lazy";
import { MapPin, Heart, Eye, Navigation } from "lucide-react";
import { SocialShareButtons } from "@/components/social-share-buttons";
import { InnerHeader } from "@/components/app-header";
import { useRealtimeViews } from "@/hooks/use-realtime-views";
import { formatListingPrice } from "@/lib/utils";
import { getProviderName, formatLocation, getFirstImageUrl } from "@/lib/formatters";
import type { ReviewWithClient } from "@/components/ui/review-item";

// Dynamic imports for code-splitting.
//
// Lightbox and LocationMapModal stay ssr:false: they pull in heavy
// browser-only deps (Leaflet, focus traps) and they're modals that
// only render on click, so SSR'ing them is dead weight.
//
// ProviderCard used to be ssr:false too, which meant the sidebar
// flashed a blank column on first paint while the client chunk
// loaded. It's pure UI (no browser APIs), so letting it SSR gets
// rid of the flash — the card renders inline with the rest of the
// page.
//
// ReviewsList stays ssr:false on purpose: it fires its own REST
// fetch through ZenStack on mount. If we SSR'd it we'd pay that
// round-trip on every detail-page hit before the HTML even ships,
// instead of streaming it in after hydration.
const ImageLightbox = dynamic(
  () => import("@/components/image-lightbox").then((mod) => mod.ImageLightbox),
  { ssr: false }
);

const ProviderCard = dynamic(() =>
  import("@/components/provider-card").then((mod) => mod.ProviderCard)
);

const ReviewsList = dynamic(
  () => import("@/components/reviews-list").then((mod) => mod.ReviewsList),
  { ssr: false }
);

const LocationMapModal = dynamic(
  () => import("@/components/location-map-modal").then((mod) => mod.LocationMapModal),
  { ssr: false }
);

// Type for listing data from server
export interface ServiceDetailListing {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  is_negotiable: boolean;
  views_count: number;
  duration_minutes: number | null;
  work_hours_start: string | null;
  work_hours_end: string | null;
  service_type: string | null;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    company_name: string | null;
    is_company: boolean;
    is_verified: boolean;
    created_at: Date;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  images: Array<{
    id: string;
    url: string;
    sort_order: number;
    alt: string | null;
  }>;
  aimag: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  khoroo: { id: string; name: string } | null;
  address_detail: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ServiceDetailClientProps {
  listing: ServiceDetailListing;
  /**
   * SSR-seeded review list (up to 10 most recent). Passed to
   * ReviewsList as initialData so the mobile + desktop review
   * sections render without their two ZenStack round-trips on mount.
   */
  initialReviews?: ReviewWithClient[];
  initialReviewsTotal?: number;
}

export const ServiceDetailClient = React.memo(function ServiceDetailClient({
  listing,
  initialReviews,
  initialReviewsTotal,
}: ServiceDetailClientProps) {
  const t = useTranslations("listings");
  // Используем раздельные хуки для лучшей производительности
  const { isFavorite } = useFavoriteIds();
  const { toggleFavorite } = useFavoriteActions();
  const { user } = useAuth();
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const [showMapModal, setShowMapModal] = React.useState(false);

  // Проверяем есть ли координаты для показа на карте
  const hasCoordinates = listing.latitude && listing.longitude;

  // Real-time обновление счётчика просмотров
  const { viewsCount } = useRealtimeViews({
    listingId: listing.id,
    initialCount: listing.views_count,
    enabled: !!listing.id,
  });

  // Track view as a fire-and-forget sendBeacon. Previously this was a
  // fetch() + .then() that held the hydration thread waiting on a
  // response we didn't actually use — the setQueryData call wrote to
  // a handrolled key that never matched ZenStack's real cache slot
  // (["zenstack", ...]), so nothing downstream ever read it. Dead
  // round-trip, dead cache write.
  //
  // sendBeacon ships the POST during idle / unload time, doesn't
  // block page interactivity, and has no callback. The server still
  // deduplicates (24h uniqueness window) and bumps the counter.
  // Scheduled through requestIdleCallback so even the beacon call
  // itself waits until the main thread is free.
  const viewTrackedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!listing.slug || viewTrackedRef.current === listing.slug) return;
    viewTrackedRef.current = listing.slug;

    const ship = () => {
      const url = `/api/listings/${listing.slug}/view`;
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        // sendBeacon expects a body; an empty Blob is fine — the
        // route reads slug from the URL, not the payload.
        navigator.sendBeacon(url, new Blob([], { type: "application/json" }));
      } else {
        // Fallback for the rare UA without Beacon API. keepalive lets
        // the request survive page navigation the same way a beacon
        // would. We still don't await.
        void fetch(url, { method: "POST", credentials: "include", keepalive: true });
      }
    };

    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (idle) idle(ship);
    else setTimeout(ship, 0);
  }, [listing.slug]);

  const handleSave = () => {
    // Pass a listing snapshot so the /favorites grid can show the new
    // card optimistically without waiting for a round-trip. favorites_count
    // isn't available on this page's shape — UI shows a small badge we can
    // live without for the optimistic state; the refetch replaces it.
    toggleFavorite(listing.id, {
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      description: listing.description,
      price: listing.price,
      currency: listing.currency,
      is_negotiable: listing.is_negotiable,
      views_count: listing.views_count,
      favorites_count: 0,
      category: listing.category,
      aimag: listing.aimag,
      images: listing.images.map((img) => ({ id: img.id, url: img.url })),
      user: {
        id: listing.user.id,
        first_name: listing.user.first_name,
        last_name: listing.user.last_name,
        avatar_url: listing.user.avatar_url,
        is_verified: listing.user.is_verified,
      },
    });
  };

  // All of these derive from `listing`, which is stable for the
  // lifetime of this page — the listing object doesn't change once
  // the server hands it over. Memoizing keeps re-renders triggered
  // by unrelated context updates (favorites, theme, auth) from
  // redoing the same string concatenation every frame.
  const providerName = React.useMemo(() => getProviderName(listing.user), [listing.user]);
  const priceDisplay = React.useMemo(
    () => formatListingPrice(listing.price, listing.currency, listing.is_negotiable),
    [listing.price, listing.currency, listing.is_negotiable]
  );
  const locationDisplay = React.useMemo(() => formatLocation(listing), [listing]);
  const imageUrl = React.useMemo(() => getFirstImageUrl(listing.images), [listing.images]);
  const memberSince = React.useMemo(
    () => new Date(listing.user.created_at).getFullYear().toString(),
    [listing.user.created_at]
  );
  const isOwnListing = user?.id === listing.user.id;
  // isFavorite identity changes when any favorite flips; memoizing on
  // listing.id + isFavorite skips the Set lookup on re-renders where
  // neither changed.
  const isFav = React.useMemo(() => isFavorite(listing.id), [isFavorite, listing.id]);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-20 lg:pb-0">
      {/* Same header shell loading.tsx uses — no layout flash when
          the server data lands and this client renders. */}
      <InnerHeader />

      <main className="container mx-auto px-4 md:px-6 py-4 md:py-8 pb-24 lg:pb-10">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Main Image with preload priority */}
            <div
              className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group ring-1 ring-border bg-muted"
              onClick={() => {
                setLightboxIndex(0);
                setLightboxOpen(true);
              }}
              style={{ transitionTimingFunction: "var(--ease-brand)" }}
            >
              <Image
                src={imageUrl}
                alt={listing.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                style={{ transitionTimingFunction: "var(--ease-brand)" }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>

            {/* Share & Like Buttons */}
            <div className="flex items-center gap-2">
              <SocialShareButtons
                title={listing.title}
                description={listing.description}
                className="flex-1 sm:flex-none"
              />
              {!isOwnListing && (
                <button
                  type="button"
                  onClick={handleSave}
                  aria-label={isFav ? t("saved") : t("save")}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-all active:scale-[0.98] ${
                    isFav
                      ? "bg-brand/10 text-brand ring-1 ring-brand/20 hover:bg-brand/15"
                      : "border border-border bg-card hover:bg-muted"
                  }`}
                  style={{ transitionTimingFunction: "var(--ease-brand)" }}
                >
                  <Heart className={`h-4 w-4 ${isFav ? "fill-brand text-brand" : ""}`} />
                  <span>{isFav ? t("saved") : t("save")}</span>
                </button>
              )}
            </div>

            {/* Title & Price Card */}
            <div className="bg-card rounded-2xl ring-1 ring-border p-5 md:p-6 space-y-4">
              {/* Category micro-label */}
              {listing.category?.name && (
                <span className="inline-block text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {listing.category.name}
                </span>
              )}

              <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight wrap-anywhere">
                {listing.title}
              </h1>

              {/* Price — hero */}
              <p className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tabular tracking-tight">
                {priceDisplay}
              </p>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Location + Map CTA */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] md:text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      {t("location")}
                    </p>
                    <p className="font-medium text-sm md:text-base mt-0.5 wrap-break-word">
                      {listing.service_type === "remote" && listing.address_detail
                        ? listing.address_detail
                        : locationDisplay}
                    </p>
                  </div>
                </div>
                {hasCoordinates && (
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    aria-label="Газрын зурагт харах"
                    className="self-start shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 hover:bg-blue-600 hover:text-white hover:ring-blue-600 active:scale-95 transition-[background-color,color,box-shadow,transform] duration-200 text-xs font-semibold"
                    style={{ transitionTimingFunction: "var(--ease-brand)" }}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span className="leading-none tracking-wide">Газар</span>
                  </button>
                )}
              </div>

              {/* Views stat */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  <span className="tabular">{viewsCount}</span>
                  <span>{t("views")}</span>
                </div>
              </div>
            </div>

            {/* Mobile Provider Card */}
            <div className="lg:hidden">
              <ProviderCard
                listingId={listing.id}
                listingTitle={listing.title}
                user={listing.user}
                providerName={providerName}
                memberSince={memberSince}
                isOwnListing={isOwnListing}
                variant="mobile"
                serviceType={listing.service_type as "on_site" | "remote" | undefined}
                initialReviews={initialReviews}
                initialReviewsTotal={initialReviewsTotal}
              />
            </div>

            {/* Description */}
            <section>
              <div className="mb-3 md:mb-4">
                <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                  {t("details")}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("serviceDescription")}</p>
              </div>
              <div className="bg-card rounded-2xl ring-1 ring-border p-5 md:p-6">
                <p className="text-sm md:text-base text-foreground/80 leading-relaxed whitespace-pre-wrap wrap-anywhere">
                  {listing.description}
                </p>
              </div>
            </section>

            {/* Gallery - lazy load images */}
            {listing.images.length > 1 && (
              <section>
                <div className="mb-3 md:mb-4">
                  <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                    {t("photos")}
                  </h2>
                </div>
                <div className="bg-card rounded-2xl ring-1 ring-border p-3 md:p-4">
                  <div className="stagger grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
                    {listing.images.slice(1).map((image, index) => (
                      <button
                        type="button"
                        key={image.id}
                        style={{ ["--i" as string]: index }}
                        onClick={() => {
                          setLightboxIndex(index + 1);
                          setLightboxOpen(true);
                        }}
                        className="group relative aspect-4/3 rounded-xl overflow-hidden cursor-pointer ring-1 ring-border bg-muted transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]"
                        aria-label={`${t("photos")} ${index + 1}`}
                      >
                        {/* First two gallery images are preloaded from the
                            page shell, so mark them eager — otherwise
                            IntersectionObserver delays them below the fold
                            even though the bytes are already on the wire. */}
                        <Image
                          src={image.url}
                          alt={image.alt || listing.title}
                          fill
                          loading={index < 2 ? "eager" : "lazy"}
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          style={{ transitionTimingFunction: "var(--ease-brand)" }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Mobile Reviews */}
            <div className="lg:hidden">
              <ReviewsList
                listingId={listing.id}
                variant="mobile"
                initialReviews={initialReviews}
                initialTotal={initialReviewsTotal}
              />
            </div>
          </div>

          {/* Right Column - Provider Info (Desktop only) */}
          <div className="hidden lg:block space-y-4">
            <div className="sticky top-24">
              <ProviderCard
                listingId={listing.id}
                listingTitle={listing.title}
                user={listing.user}
                providerName={providerName}
                memberSince={memberSince}
                isOwnListing={isOwnListing}
                variant="desktop"
                serviceType={listing.service_type as "on_site" | "remote" | undefined}
                initialReviews={initialReviews}
                initialReviewsTotal={initialReviewsTotal}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Bar */}
      {!isOwnListing && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <RequestFormLazy
            listingId={listing.id}
            listingTitle={listing.title}
            providerId={listing.user.id}
            providerName={providerName}
            serviceType={listing.service_type as "on_site" | "remote" | undefined}
          />
        </div>
      )}

      {/* Image Lightbox — only mounted after the user opens it, so
          the ~20KB chunk isn't downloaded for every page view. Once
          mounted it stays so subsequent opens are instant. */}
      {lightboxOpen && (
        <ImageLightbox
          images={listing.images}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}

      {/* Location Map Modal */}
      {showMapModal && hasCoordinates && (
        <LocationMapModal
          coordinates={[listing.latitude!, listing.longitude!]}
          address={
            listing.service_type === "remote" && listing.address_detail
              ? listing.address_detail
              : locationDisplay
          }
          title={listing.title}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
});

// Loading skeleton component
export function ServiceDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-32 md:pb-20 lg:pb-0">
      <InnerHeader />
      <main className="container mx-auto px-4 md:px-6 py-4 md:py-8 pb-24 lg:pb-10">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Hero image */}
            <Skeleton className="aspect-video rounded-2xl" />

            {/* Share + Save row */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-32 rounded-full" />
              <Skeleton className="h-10 w-24 rounded-full" />
            </div>

            {/* Title & Price card */}
            <div className="bg-card rounded-2xl ring-1 ring-border p-5 md:p-6 space-y-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 md:h-10 w-3/4" />
              <Skeleton className="h-6 md:h-8 w-2/3" />
              <Skeleton className="h-8 md:h-10 w-1/3" />
              <div className="border-t border-border" />
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>

            {/* Mobile provider card (lg:hidden) */}
            <div className="lg:hidden bg-card rounded-2xl ring-1 ring-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-full" />
            </div>

            {/* Description section */}
            <section>
              <div className="mb-3 md:mb-4 space-y-2">
                <Skeleton className="h-6 md:h-7 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="bg-card rounded-2xl ring-1 ring-border p-5 md:p-6 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </section>

            {/* Gallery */}
            <section>
              <div className="mb-3 md:mb-4">
                <Skeleton className="h-6 md:h-7 w-32" />
              </div>
              <div className="bg-card rounded-2xl ring-1 ring-border p-3 md:p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
                  <Skeleton className="aspect-4/3 rounded-xl" />
                  <Skeleton className="aspect-4/3 rounded-xl" />
                  <Skeleton className="aspect-4/3 rounded-xl hidden md:block" />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Desktop provider */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-card rounded-2xl ring-1 ring-border p-5 md:p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-11 w-full rounded-full" />
              <Skeleton className="h-11 w-full rounded-full" />
              <div className="border-t border-border pt-4 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Not found component
export function ServiceNotFound() {
  // Note: For server components that render this, translations should be passed as props
  // For now, we use a client-side approach with useTranslations
  return <ServiceNotFoundClient />;
}

function ServiceNotFoundClient() {
  const t = useTranslations("listings");
  return (
    <div className="min-h-screen bg-background">
      <InnerHeader />
      <main className="container mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="flex flex-col items-center justify-center py-16 md:py-24 text-center rounded-2xl bg-muted/40">
          <Image
            src="/icons/7486744.webp"
            alt={t("notFound")}
            width={72}
            height={72}
            className="mb-4 opacity-50"
          />
          <p className="font-display text-lg md:text-xl font-semibold">{t("notFound")}</p>
          <Link href="/" className="mt-5">
            <Button>{t("backToHome")}</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
