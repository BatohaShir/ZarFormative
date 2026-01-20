"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { useFavorites } from "@/contexts/favorites-context";
import { useAuth } from "@/contexts/auth-context";
import { ServiceRequestModal } from "@/components/service-request-modal";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { ChevronLeft, MapPin, Heart, Clock, Star, CheckCircle, ThumbsUp, ThumbsDown, MessageSquare, UserCircle, Hourglass, Eye } from "lucide-react";
import { SocialShareButtons } from "@/components/social-share-buttons";
import { ImageLightbox } from "@/components/image-lightbox";
import { useFindUniquelistings } from "@/lib/hooks/listings";
import { useRealtimeViews } from "@/hooks/use-realtime-views";
import { useQueryClient } from "@tanstack/react-query";
import { Decimal } from "@prisma/client/runtime/library";
import { formatListingPrice } from "@/lib/utils";

// Storage key for pending requests
const PENDING_REQUESTS_KEY = "uilchilgee_pending_requests";

interface PendingRequest {
  serviceId: string;
  expiresAt: number;
}

function getPendingRequests(): PendingRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(PENDING_REQUESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePendingRequest(serviceId: string) {
  const requests = getPendingRequests().filter(r => r.serviceId !== serviceId);
  const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
  requests.push({ serviceId, expiresAt });
  localStorage.setItem(PENDING_REQUESTS_KEY, JSON.stringify(requests));
}

function isPendingRequest(serviceId: string): { pending: boolean; expiresAt: number | null } {
  const requests = getPendingRequests();
  const request = requests.find(r => r.serviceId === serviceId);
  if (request && request.expiresAt > Date.now()) {
    return { pending: true, expiresAt: request.expiresAt };
  }
  return { pending: false, expiresAt: null };
}

function formatTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "00:00:00";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getProviderName(user: { first_name: string | null; last_name: string | null; company_name: string | null; is_company: boolean }): string {
  if (user.is_company && user.company_name) {
    return user.company_name;
  }
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ");
  }
  return "Хэрэглэгч";
}

function formatLocation(listing: { aimag?: { name: string } | null; district?: { name: string } | null; khoroo?: { name: string } | null; address?: string | null }): string {
  const parts: string[] = [];
  if (listing.aimag?.name) parts.push(listing.aimag.name);
  if (listing.district?.name) parts.push(listing.district.name);
  if (listing.khoroo?.name) parts.push(listing.khoroo.name);
  return parts.length > 0 ? parts.join(", ") : "Байршил тодорхойгүй";
}

function getFirstImageUrl(images: { url: string; sort_order: number }[]): string {
  if (images.length === 0) {
    return "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop";
  }
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0].url;
}

export default function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { isAuthenticated, user } = useAuth();
  const [requestModalOpen, setRequestModalOpen] = React.useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = React.useState(false);
  const [requestPending, setRequestPending] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  // Загрузка объявления из БД по slug
  const { data: listing, isLoading, refetch } = useFindUniquelistings({
    where: { slug: id },
    include: {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          avatar_url: true,
          company_name: true,
          is_company: true,
          created_at: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          sort_order: true,
          alt: true,
        },
        orderBy: {
          sort_order: "asc",
        },
      },
      aimag: {
        select: {
          id: true,
          name: true,
        },
      },
      district: {
        select: {
          id: true,
          name: true,
        },
      },
      khoroo: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // ID объявления для избранного
  const listingId = listing?.id || "";

  // Real-time обновление счётчика просмотров
  const { viewsCount } = useRealtimeViews({
    listingId: listing?.id || "",
    initialCount: listing?.views_count || 0,
    enabled: !!listing?.id,
  });

  // Check pending status on mount
  React.useEffect(() => {
    if (listing) {
      const status = isPendingRequest(listing.id);
      if (status.pending && status.expiresAt) {
        setRequestPending(true);
        setExpiresAt(status.expiresAt);
      }
    }
  }, [listing]);

  // Timer update
  React.useEffect(() => {
    if (!requestPending || !expiresAt) return;

    const updateTimer = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setRequestPending(false);
        setExpiresAt(null);
        setTimeRemaining(null);
      } else {
        setTimeRemaining(formatTimeRemaining(expiresAt));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [requestPending, expiresAt]);

  // Track view when page loads (only once per session)
  const viewTrackedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!id || viewTrackedRef.current === id) return;
    viewTrackedRef.current = id;

    // Отправляем запрос на увеличение счётчика просмотров
    fetch(`/api/listings/${id}/view`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        // Если просмотр засчитан (не skipped), обновляем данные
        if (data.success && !data.skipped) {
          // Обновляем текущее объявление
          refetch();
          // Инвалидируем кэш списков чтобы на главной тоже обновилось
          queryClient.invalidateQueries({ queryKey: ["listings", "findMany"] });
        }
      })
      .catch((err) => {
        console.error("Failed to track view:", err);
      });
  }, [id, refetch, queryClient]);

  const handleServiceRequest = () => {
    if (isAuthenticated) {
      setRequestModalOpen(true);
    } else {
      setShowLoginPrompt(true);
    }
  };

  const handleRequestSent = () => {
    if (listing) {
      savePendingRequest(listing.id);
      const newExpiresAt = Date.now() + 2 * 60 * 60 * 1000;
      setRequestPending(true);
      setExpiresAt(newExpiresAt);
    }
  };

  const handleSave = () => {
    if (listing) {
      toggleFavorite(listingId);
    }
  };

  // Loading state
  if (isLoading) {
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

  // Not found
  if (!listing) {
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

  const providerName = getProviderName(listing.user);
  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const locationDisplay = formatLocation(listing);
  const imageUrl = getFirstImageUrl(listing.images);
  const memberSince = new Date(listing.user.created_at).getFullYear().toString();
  const isOwnListing = user?.id === listing.user.id;

  // Mock provider data (в будущем можно добавить реальную статистику)
  const providerStats = {
    successfulServices: 0,
    failedServices: 0,
    likes: 0,
    rating: 0,
    reviews: 0,
  };

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
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
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
            {/* Image */}
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
                className={`flex-1 sm:flex-none ${isFavorite(listingId) ? "bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-950/30 dark:border-pink-800" : ""}`}
                onClick={handleSave}
              >
                <Heart className={`h-4 w-4 mr-2 ${isFavorite(listingId) ? "fill-current" : ""}`} />
                {isFavorite(listingId) ? "Хадгалсан" : "Хадгалах"}
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

            {/* Mobile Provider Card */}
            <div className="lg:hidden border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {listing.user.avatar_url ? (
                    <Image
                      src={listing.user.avatar_url}
                      alt={providerName}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-medium text-primary">
                      {providerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{providerName}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{memberSince} оноос хойш</span>
                  </div>
                </div>
              </div>

              {!isOwnListing && (
                <Link href={`/account/${listing.user.id}`}>
                  <Button variant="outline" className="w-full" size="sm">
                    <UserCircle className="h-4 w-4 mr-2" />
                    Профиль харах
                  </Button>
                </Link>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2 md:space-y-3">
              <h2 className="text-base md:text-lg font-semibold">Дэлгэрэнгүй</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* Gallery - без главного фото */}
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
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Reviews placeholder */}
            <div className="lg:hidden space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Сэтгэгдэл (0)
                </h2>
              </div>
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Одоогоор сэтгэгдэл байхгүй байна</p>
              </div>
            </div>
          </div>

          {/* Right Column - Provider Info (Desktop only) */}
          <div className="hidden lg:block space-y-4">
            <div className="border rounded-2xl p-6 space-y-4 sticky top-24">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {listing.user.avatar_url ? (
                    <Image
                      src={listing.user.avatar_url}
                      alt={providerName}
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-medium text-primary">
                      {providerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{providerName}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{memberSince} оноос хойш гишүүн</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {requestPending ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <Hourglass className="h-5 w-5 animate-pulse" />
                      <span className="font-medium">Хүсэлт илгээгдсэн</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Та {providerName}-д хүсэлт илгээсэн байна. Баталгаажуулалт болон харилцаа эхлэхийг хүлээнэ үү.
                    </p>
                    <div className="flex items-center justify-center gap-2 p-3 bg-background rounded-lg">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-lg font-bold">{timeRemaining || "02:00:00"}</span>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      Хугацаа дуусахад дахин хүсэлт илгээх боломжтой
                    </p>
                  </div>
                ) : (
                  <Button className="w-full" size="lg" onClick={handleServiceRequest}>
                    Үйлчилгээ авах
                  </Button>
                )}
                {!isOwnListing && (
                  <Link href={`/account/${listing.user.id}`}>
                    <Button variant="ghost" className="w-full" size="lg">
                      <UserCircle className="h-4 w-4 mr-2" />
                      Профиль харах
                    </Button>
                  </Link>
                )}
              </div>

              {/* Reviews placeholder */}
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Сэтгэгдэл (0)
                  </h3>
                </div>
                <div className="text-center py-6 bg-muted/30 rounded-lg">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Одоогоор сэтгэгдэл байхгүй байна</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background border-t p-3 z-40">
        {requestPending ? (
          <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Hourglass className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Хүсэлт илгээгдсэн</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{timeRemaining || "02:00:00"}</span>
            </div>
          </div>
        ) : (
          <Button className="w-full" size="default" onClick={handleServiceRequest}>
            Үйлчилгээ авах
          </Button>
        )}
      </div>

      {/* Service Request Modal */}
      <ServiceRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        provider={{
          name: providerName,
          avatar: listing.user.avatar_url || "",
          rating: providerStats.rating,
        }}
        serviceTitle={listing.title}
        onRequestSent={handleRequestSent}
      />

      {/* Login Prompt Modal */}
      <LoginPromptModal
        open={showLoginPrompt}
        onOpenChange={setShowLoginPrompt}
        onSuccess={() => setRequestModalOpen(true)}
      />

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
