"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { useFavoriteIds, useFavoriteActions } from "@/contexts/favorites-context";
import { useAuth } from "@/contexts/auth-context";
import { RequestForm } from "@/components/request-form";
import { ChevronLeft, MapPin, Heart, Clock, Eye, CalendarClock } from "lucide-react";
import { SocialShareButtons } from "@/components/social-share-buttons";
import { useRealtimeViews } from "@/hooks/use-realtime-views";
import { useQueryClient } from "@tanstack/react-query";
import { formatListingPrice } from "@/lib/utils";
import { getProviderName, formatLocation, getFirstImageUrl } from "@/lib/formatters";

// Dynamic imports for code-splitting
const ImageLightbox = dynamic(
  () => import("@/components/image-lightbox").then((mod) => mod.ImageLightbox),
  { ssr: false }
);

const ProviderCard = dynamic(
  () => import("@/components/provider-card").then((mod) => mod.ProviderCard),
  { ssr: false }
);

const ReviewsList = dynamic(
  () => import("@/components/reviews-list").then((mod) => mod.ReviewsList),
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
}

interface ServiceDetailClientProps {
  listing: ServiceDetailListing;
}

export function ServiceDetailClient({ listing }: ServiceDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Используем раздельные хуки для лучшей производительности
  const { isFavorite } = useFavoriteIds();
  const { toggleFavorite } = useFavoriteActions();
  const { user } = useAuth();
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  // Real-time обновление счётчика просмотров
  const { viewsCount } = useRealtimeViews({
    listingId: listing.id,
    initialCount: listing.views_count,
    enabled: !!listing.id,
  });

  // Track view when page loads (only once per session)
  const viewTrackedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!listing.slug || viewTrackedRef.current === listing.slug) return;
    viewTrackedRef.current = listing.slug;

    fetch(`/api/listings/${listing.slug}/view`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && !data.skipped && data.views_count !== undefined) {
          queryClient.setQueryData(
            ["listings", "findUnique", { where: { slug: listing.slug } }],
            (oldData: typeof listing) =>
              oldData ? { ...oldData, views_count: data.views_count } : oldData
          );
        }
      })
      .catch(() => {
        // Silently fail - view tracking is not critical
      });
  }, [listing.slug, queryClient]);

  const handleSave = () => {
    toggleFavorite(listing.id);
  };

  const providerName = getProviderName(listing.user);
  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const locationDisplay = formatLocation(listing);
  const imageUrl = getFirstImageUrl(listing.images);
  const memberSince = new Date(listing.user.created_at).getFullYear().toString();
  const isOwnListing = user?.id === listing.user.id;
  const isFav = isFavorite(listing.id);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-20 lg:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Link href="/" className="hidden sm:block">
              <h1 className="text-lg md:text-2xl font-bold">
                <span className="text-[#c4272f]">Uilc</span>
                <span className="text-[#015197]">hilge</span>
                <span className="text-[#c4272f]">e.mn</span>
              </h1>
            </Link>
          </div>
          {/* Mobile Nav - notifications bell */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationsButton />
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <NotificationsButton />
            <RequestsButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 pb-24 lg:pb-6">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Main Image with preload priority */}
            <div
              className="relative aspect-video rounded-xl md:rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => {
                setLightboxIndex(0);
                setLightboxOpen(true);
              }}
            >
              <Image
                src={imageUrl}
                alt={listing.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <span className="absolute top-2 left-2 md:top-4 md:left-4 bg-white/95 dark:bg-black/80 text-foreground px-2 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium">
                {listing.category?.name}
              </span>
            </div>

            {/* Share & Like Buttons */}
            <div className="flex items-center gap-2">
              <SocialShareButtons
                title={listing.title}
                description={listing.description}
                className="flex-1 sm:flex-none"
              />
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 sm:flex-none ${isFav ? "bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-950/30 dark:border-pink-800" : ""}`}
                onClick={handleSave}
              >
                <Heart className={`h-4 w-4 mr-2 ${isFav ? "fill-current" : ""}`} />
                {isFav ? "Хадгалсан" : "Хадгалах"}
              </Button>
            </div>

            {/* Title & Price */}
            <div>
              <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">{listing.title}</h1>
              <p className="text-2xl md:text-3xl font-bold text-primary">{priceDisplay}</p>
            </div>

            {/* Location & Views */}
            <div className="flex items-center gap-4 text-muted-foreground text-sm md:text-base">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>{locationDisplay}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>{viewsCount} үзсэн</span>
              </div>
            </div>

            {/* Duration & Work Hours */}
            {(listing.duration_minutes || listing.work_hours_start) && (
              <div className="flex flex-wrap gap-3">
                {listing.duration_minutes && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      Үргэлжлэх хугацаа:{" "}
                      {listing.duration_minutes < 60
                        ? `${listing.duration_minutes} мин`
                        : listing.duration_minutes % 60 === 0
                          ? `${Math.floor(listing.duration_minutes / 60)} цаг`
                          : `${Math.floor(listing.duration_minutes / 60)} цаг ${listing.duration_minutes % 60} мин`}
                    </span>
                  </div>
                )}
                {listing.work_hours_start && listing.work_hours_end && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm">
                    <CalendarClock className="h-4 w-4" />
                    <span className="font-medium">Ажлын цаг: {listing.work_hours_start} - {listing.work_hours_end}</span>
                  </div>
                )}
              </div>
            )}

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
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:space-y-3">
              <h2 className="text-base md:text-lg font-semibold">Дэлгэрэнгүй</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* Gallery - lazy load images */}
            {listing.images.length > 1 && (
              <div className="space-y-2 md:space-y-3">
                <h2 className="text-base md:text-lg font-semibold">Зургууд ({listing.images.length - 1})</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {listing.images.slice(1).map((image, index) => (
                    <div
                      key={image.id}
                      className="relative aspect-4/3 rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => {
                        setLightboxIndex(index + 1);
                        setLightboxOpen(true);
                      }}
                    >
                      <Image
                        src={image.url}
                        alt={image.alt || listing.title}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Reviews */}
            <div className="lg:hidden">
              <ReviewsList providerId={listing.user.id} variant="mobile" />
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
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Bar */}
      {!isOwnListing && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background border-t p-3 z-40">
          <RequestForm
            listingId={listing.id}
            listingTitle={listing.title}
            providerId={listing.user.id}
            providerName={providerName}
          />
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={listing.images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
}

// Loading skeleton component
export function ServiceDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded" />
            <Skeleton className="h-6 w-32 hidden sm:block" />
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-10 w-10 rounded" />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <Skeleton className="aspect-video rounded-xl md:rounded-2xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="hidden lg:block">
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}

// Not found component
export function ServiceNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <Image
          src="/icons/7486744.png"
          alt="Not found"
          width={80}
          height={80}
          className="mx-auto mb-4 opacity-70"
        />
        <h1 className="text-xl md:text-2xl font-bold mb-4">Үйлчилгээ олдсонгүй</h1>
        <Link href="/">
          <Button>Нүүр хуудас руу буцах</Button>
        </Link>
      </div>
    </div>
  );
}
