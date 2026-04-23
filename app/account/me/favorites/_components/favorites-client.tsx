"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MapPin, Eye, Loader2, Trash2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { VerifiedBadge } from "@/components/verified-badge";
import {
  useFavoriteIds,
  useFavoriteActions,
  useFavoritesFullData,
  type FavoriteWithListing,
} from "@/contexts/favorites-context";
import type { FavoritePageRow } from "@/lib/favorites/query";
import { formatListingPrice } from "@/lib/utils";
import { formatLocation } from "@/lib/formatters";
import { toast } from "sonner";

// Lazy-load map modal — same pattern as ListingCard. The chunk is only
// pulled in when a user opens the map from a card.
const mapModalLoader = () =>
  import("@/components/location-map-modal").then((mod) => mod.LocationMapModal);
const LocationMapModal = dynamic(mapModalLoader, { ssr: false });

let mapModalWarmed = false;
const warmMapModal = () => {
  if (mapModalWarmed) return;
  mapModalWarmed = true;
  mapModalLoader().catch(() => {
    mapModalWarmed = false;
  });
};

// Lazy load LoginPromptModal - not loaded until needed
const LoginPromptModal = dynamic(
  () =>
    import("@/components/login-prompt-modal").then((mod) => ({ default: mod.LoginPromptModal })),
  { ssr: false }
);

// Локальный placeholder вместо Unsplash
const PLACEHOLDER_IMAGE = "/images/placeholder-listing.svg";

// Skeleton для загрузки — соответствует FavoriteCard (1:1 с ListingCard)
function FavoriteCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden ring-1 ring-border flex h-full flex-col">
      <Skeleton className="aspect-square" />
      <div className="p-3.5 md:p-4 space-y-2 flex-1 flex flex-col">
        <div className="space-y-1">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-6 w-24" />
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-3 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Карточка избранного — editorial: square image + content block
const FavoriteCard = React.memo(function FavoriteCard({
  favorite,
  onRemove,
  priority = false,
}: {
  favorite: FavoriteWithListing;
  onRemove: (id: string, title: string) => void;
  /** LCP-priority image for the first few above-the-fold cards. */
  priority?: boolean;
}) {
  const listing = favorite.listing;
  const imageUrl = listing.images?.[0]?.url || PLACEHOLDER_IMAGE;
  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const locationDisplay = React.useMemo(() => formatLocation(listing), [listing]);
  const hasCoordinates = listing.latitude != null && listing.longitude != null;
  const [showMapModal, setShowMapModal] = React.useState(false);

  const providerName = React.useMemo(() => {
    const user = listing.user;
    const first = user.first_name?.trim();
    const last = user.last_name?.trim();
    if (last && first) return `${last.charAt(0).toUpperCase()}. ${first}`;
    if (first) return first;
    if (last) return last;
    return "Хэрэглэгч";
  }, [listing.user]);

  const handleRemove = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onRemove(listing.id, listing.title);
    },
    [onRemove, listing.id, listing.title]
  );

  const handleShowMap = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMapModal(true);
  }, []);

  return (
    <Link
      href={`/services/${listing.slug}`}
      prefetch={null}
      className={cn(
        "group relative flex h-full flex-col rounded-2xl overflow-hidden transition-all duration-200",
        "bg-card ring-1 ring-border hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]"
      )}
      style={{ transitionTimingFunction: "var(--ease-brand)" }}
    >
      {/* Image — square */}
      <div className="aspect-square relative overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Remove button (Heart → Trash on hover) */}
        <button
          onClick={handleRemove}
          aria-label="Таалагдсанаас хасах"
          title="Хасах"
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-background/70 backdrop-blur-md hover:bg-background active:scale-90 transition-all group/btn"
        >
          <Heart className="w-4.5 h-4.5 fill-brand text-brand group-hover/btn:hidden" />
          <Trash2 className="w-4.5 h-4.5 text-foreground hidden group-hover/btn:block" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3.5 md:p-4 space-y-2">
        {/* Title + category micro-label */}
        <div className="space-y-1">
          <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide font-medium">
            {listing.category.name}
          </span>
          <h4 className="font-display font-semibold text-[15px] md:text-base leading-snug line-clamp-2 min-h-10">
            {listing.title}
          </h4>
        </div>

        {/* Price — hero of the card */}
        <p className="font-display text-lg md:text-xl font-bold tabular tracking-tight">
          {priceDisplay}
        </p>

        {/* Provider + stats */}
        <div className="mt-auto flex items-center justify-between pt-1.5 border-t border-border">
          <div className="flex items-center gap-2 min-w-0 flex-1 pt-2">
            {listing.user.avatar_url ? (
              <Image
                src={listing.user.avatar_url}
                alt={providerName}
                width={20}
                height={20}
                unoptimized={listing.user.avatar_url.includes("dicebear")}
                className="rounded-full object-cover w-5 h-5 shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-foreground shrink-0">
                {providerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-muted-foreground truncate">{providerName}</span>
            <VerifiedBadge verified={listing.user.is_verified} size="sm" />
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground shrink-0 pt-2 tabular">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {listing.views_count}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 fill-brand text-brand" />
              {listing.favorites_count}
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="text-[11px] md:text-xs truncate flex-1">{locationDisplay}</span>
          {hasCoordinates && (
            <button
              onClick={handleShowMap}
              onPointerEnter={warmMapModal}
              onTouchStart={warmMapModal}
              onFocus={warmMapModal}
              aria-label="Газрын зурагт харах"
              className={cn(
                "group/map relative inline-flex items-center gap-1 shrink-0",
                "h-7 pl-2 pr-2.5 rounded-full",
                "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-400",
                "hover:bg-blue-600 hover:text-white hover:ring-blue-600",
                "active:scale-95",
                "transition-[background-color,color,box-shadow,transform] duration-200",
                "touch-manipulation",
                "before:content-[''] before:absolute before:inset-0 before:-m-2 before:rounded-full"
              )}
              style={{ transitionTimingFunction: "var(--ease-brand)" }}
            >
              <Navigation className="w-3 h-3 shrink-0" />
              <span className="text-[10px] font-semibold leading-none tracking-wide">Газар</span>
            </button>
          )}
        </div>
      </div>

      {showMapModal && hasCoordinates && (
        <LocationMapModal
          coordinates={[Number(listing.latitude), Number(listing.longitude)]}
          address={locationDisplay}
          title={listing.title}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </Link>
  );
});

// Пустое состояние
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 md:py-24 text-center rounded-2xl bg-muted/40">
      <div className="h-14 w-14 rounded-2xl bg-card ring-1 ring-border flex items-center justify-center mb-5">
        <Heart className="h-6 w-6 fill-brand text-brand" />
      </div>
      <p className="font-display text-lg font-semibold">Таалагдсан зүйлс хоосон</p>
      <p className="text-muted-foreground text-sm mt-1 max-w-sm">
        Үйлчилгээнүүдийг үзэж, зүрхэн дээр дарж дуртай зараа хадгалаарай
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all"
      >
        <Heart className="h-4 w-4" />
        Үйлчилгээ хайх
      </Link>
    </div>
  );
}

interface FavoritesClientProps {
  /**
   * SSR-rendered list. The server already queried the user's favorites
   * in one CTE round-trip, so the client renders cards immediately
   * instead of waiting on a mount-time findMany. When the client later
   * toggles favorites, useFavoritesFullData's optimistic filter
   * against favoriteListingIds drops the removed rows from this list.
   */
  initialFavorites?: FavoritePageRow[];
}

export function FavoritesClient({ initialFavorites }: FavoritesClientProps = {}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  // OPTIMIZATION: Используем разделённые хуки для лучшей производительности
  const { count } = useFavoriteIds();
  const { toggleFavorite, isToggling } = useFavoriteActions();
  // Полные данные загружаются ТОЛЬКО на этой странице (не на главной).
  // Передаём SSR seed — React Query считает query уже fresh, так что
  // mount-time findMany вообще не стреляет. Background refresh
  // произойдёт только после staleTime (см. CACHE_TIMES.FAVORITES).
  // useFavoritesFullData already applies optimistic filtering against
  // favoriteListingIds, so toggleFavorite removes rows without waiting
  // on the server round-trip.
  const { favorites, isLoading } = useFavoritesFullData({
    initialData: initialFavorites,
  });

  // Skeleton only when we truly have nothing — SSR seed almost always
  // gives us rows on first render.
  const showSkeleton = isLoading && favorites.length === 0;

  const [showLoginModal, setShowLoginModal] = React.useState(false);

  // Track removed items for Undo functionality
  const undoTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const handleLoginSuccess = React.useCallback(() => {
    setShowLoginModal(false);
  }, []);

  const handleLoginModalClose = React.useCallback(
    (open: boolean) => {
      if (!open && !isAuthenticated) {
        router.push("/");
      } else {
        setShowLoginModal(open);
      }
    },
    [isAuthenticated, router]
  );

  // Remove favorite with Undo toast
  const handleRemoveFavorite = React.useCallback(
    (listingId: string, title: string) => {
      // Optimistically remove (context already handles this)
      toggleFavorite(listingId);

      // Show toast
      toast.success(
        <div className="flex items-center gap-2">
          <span className="truncate max-w-50">&quot;{title}&quot; хасагдлаа</span>
        </div>,
        {
          duration: 3000,
          icon: <Heart className="w-4 h-4 text-brand" />,
        }
      );
    },
    [toggleFavorite]
  );

  // Не авторизован
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-foreground text-background flex items-center justify-center mx-auto mb-6">
              <Heart className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-2">Нэвтэрнэ үү</h2>
            <p className="text-muted-foreground text-sm">
              Дуртай үйлчилгээнүүдээ хадгалж, хүссэн үедээ үзэхийн тулд нэвтрэх шаардлагатай
            </p>
          </div>
        </div>
        {showLoginModal && (
          <LoginPromptModal
            open={showLoginModal}
            onOpenChange={handleLoginModalClose}
            onSuccess={handleLoginSuccess}
            title="Таалагдсан"
            description="Дуртай үйлчилгээнүүдээ хадгалахын тулд нэвтрэх шаардлагатай."
            icon={Heart}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader backHref="/" />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Editorial page title */}
        <div className="mb-6 md:mb-10">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
              Таалагдсан
            </h1>
            {isToggling && (
              <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 tabular">
            {showSkeleton ? "Ачааллаж байна…" : `${count} үйлчилгээ хадгалсан`}
          </p>
        </div>

        {/* Loading State — only when we truly have nothing to show.
            With initialFavorites from SSR we go straight to the grid. */}
        {showSkeleton ? (
          <div className="stagger grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-full" style={{ ["--i" as string]: i }}>
                <FavoriteCardSkeleton />
              </div>
            ))}
          </div>
        ) : favorites.length > 0 ? (
          /* Favorites Grid */
          <div className="stagger grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {favorites.map((favorite, i) => (
              <div key={favorite.id} className="h-full" style={{ ["--i" as string]: i }}>
                <FavoriteCard
                  favorite={favorite}
                  onRemove={handleRemoveFavorite}
                  // Eager-load images for the first 4 — they're above the
                  // fold on every viewport and Image's default lazy
                  // waits for IntersectionObserver which can stall LCP.
                  priority={i < 4}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <EmptyState />
        )}
      </div>
    </div>
  );
}
