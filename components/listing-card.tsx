"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Heart, MapPin, Eye, User, Navigation, Crown } from "lucide-react";
import { useFavoriteIds, useFavoriteActions } from "@/contexts/favorites-context";
import { useAuth } from "@/contexts/auth-context";
import { VerifiedBadge } from "@/components/verified-badge";
import type {
  listings,
  profiles,
  categories,
  listings_images,
  aimags,
  districts,
  khoroos,
} from "@prisma/client";
import { formatListingPrice, cn } from "@/lib/utils";
import { getProviderName, formatLocation, getFirstImageUrl } from "@/lib/formatters";

// Lazy load map modal. Exposed prefetcher so hover/touchstart can warm the chunk
// (and Leaflet + tiles) before the user actually clicks the button.
const mapModalLoader = () =>
  import("@/components/location-map-modal").then((mod) => mod.LocationMapModal);
const LocationMapModal = dynamic(mapModalLoader, { ssr: false });

let mapModalWarmed = false;
const warmMapModal = () => {
  if (mapModalWarmed) return;
  mapModalWarmed = true;
  // Fire-and-forget; errors are irrelevant — the real import will retry.
  mapModalLoader().catch(() => {
    mapModalWarmed = false;
  });
};

// Тип объявления с включёнными связями
export type ListingWithRelations = listings & {
  user: Pick<
    profiles,
    "id" | "first_name" | "last_name" | "avatar_url" | "company_name" | "is_company" | "is_verified"
  >;
  category: Pick<categories, "id" | "name" | "slug">;
  images: Pick<listings_images, "id" | "url" | "sort_order">[];
  aimag?: Pick<aimags, "id" | "name" | "latitude" | "longitude"> | null;
  district?: Pick<districts, "id" | "name" | "latitude" | "longitude"> | null;
  khoroo?: Pick<khoroos, "id" | "name"> | null;
  duration_minutes?: number | null;
  work_hours_start?: string | null;
  work_hours_end?: string | null;
};

interface ListingCardProps {
  listing: ListingWithRelations;
  /** Prioritize image loading for LCP optimization (first visible cards) */
  priority?: boolean;
  isVip?: boolean;
}

export const ListingCard = React.memo(function ListingCard({
  listing,
  priority = false,
  isVip = false,
}: ListingCardProps) {
  // OPTIMIZATION: Use separate context hooks to avoid re-renders from unrelated context changes
  const { isFavorite } = useFavoriteIds();
  const { toggleFavorite, isToggling } = useFavoriteActions();
  const { user } = useAuth();
  const router = useRouter();

  // Warm the detail page's RSC payload + Data Cache slot the moment
  // the user shows intent (hover on desktop, touchstart on mobile).
  // By the time they actually click, the server CTE has already run
  // and Next.js paints the page from the warm cache instead of
  // flashing loading.tsx (the visible skeleton flash on prod).
  // Idempotent — Next.js dedupes prefetches per route.
  const warmedRef = React.useRef(false);
  const prefetchDetail = React.useCallback(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    router.prefetch(`/services/${listing.slug}`);
  }, [router, listing.slug]);
  // OPTIMIZATION: Memoize isFavorite check to avoid O(n) search on every render
  const isLiked = React.useMemo(() => isFavorite(listing.id), [isFavorite, listing.id]);
  const isOwnListing = user?.id === listing.user.id;
  const [showMapModal, setShowMapModal] = React.useState(false);

  // Проверяем есть ли координаты для показа на карте
  const hasCoordinates = listing.latitude && listing.longitude;

  // Используем ref для isToggling чтобы избежать пересоздания callback
  const isTogglingRef = React.useRef(isToggling);
  React.useEffect(() => {
    isTogglingRef.current = isToggling;
  }, [isToggling]);

  const handleLike = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isTogglingRef.current) return;
      // Hand a snapshot of what the card already has to the context
      // so the /favorites grid can render this new row optimistically
      // before the create mutation settles.
      toggleFavorite(listing.id, {
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        description: listing.description,
        price: listing.price as unknown as number | string | null,
        currency: listing.currency,
        is_negotiable: listing.is_negotiable,
        views_count: listing.views_count,
        favorites_count: listing.favorites_count,
        category: listing.category,
        aimag: listing.aimag ? { id: listing.aimag.id, name: listing.aimag.name } : null,
        images: listing.images.map((img) => ({ id: img.id, url: img.url })),
        user: {
          id: listing.user.id,
          first_name: listing.user.first_name,
          last_name: listing.user.last_name,
          avatar_url: listing.user.avatar_url,
          is_verified: listing.user.is_verified,
        },
      });
    },
    [toggleFavorite, listing]
  );

  const handleShowMap = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMapModal(true);
  }, []);

  const providerName = React.useMemo(() => {
    const u = listing.user;
    if (u?.is_company && u.company_name) return u.company_name;
    const first = u?.first_name?.trim();
    const last = u?.last_name?.trim();
    if (last && first) return `${last.charAt(0).toUpperCase()}. ${first}`;
    return getProviderName(u);
  }, [listing.user]);

  // Мемоизация URL изображения - избегаем сортировки на каждый рендер
  const imageUrl = React.useMemo(() => getFirstImageUrl(listing.images), [listing.images]);

  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const locationDisplay = formatLocation(listing);

  return (
    <Link
      href={`/services/${listing.slug}`}
      prefetch={null}
      onMouseEnter={prefetchDetail}
      onTouchStart={prefetchDetail}
      onFocus={prefetchDetail}
      className={cn(
        "group relative flex h-full flex-col rounded-2xl overflow-hidden transition-all duration-200",
        "hover:-translate-y-0.5 active:scale-[0.99]",
        isVip
          ? "bg-card ring-2 ring-amber-400/70 hover:shadow-xl"
          : "bg-card ring-1 ring-border hover:shadow-xl"
      )}
      style={{ transitionTimingFunction: "var(--ease-brand)" }}
    >
      {/* Image — square */}
      <div className="aspect-square relative overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* VIP badge */}
        {isVip && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-linear-to-br from-amber-300 via-yellow-400 to-amber-600 text-amber-950 text-[10px] font-bold uppercase tracking-wide shadow-md ring-1 ring-amber-500/50">
            <Crown className="w-3 h-3" />
            VIP
          </div>
        )}

        {/* Own / Like */}
        {isOwnListing ? (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] bg-foreground/90 text-background px-2 py-1 rounded-full font-medium flex items-center gap-1 backdrop-blur-sm">
              <User className="w-3 h-3" />
              Миний
            </span>
          </div>
        ) : (
          <button
            onClick={handleLike}
            aria-label="Taалагдсан"
            className={cn(
              "absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full transition-all",
              "bg-background/70 backdrop-blur-md hover:bg-background active:scale-90"
            )}
          >
            <Heart
              className={cn(
                "w-4.5 h-4.5 transition-all",
                isLiked ? "fill-brand text-brand scale-110" : "text-foreground"
              )}
            />
          </button>
        )}
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
              <Heart className={cn("w-3 h-3", isLiked && "fill-brand text-brand")} />
              {listing.favorites_count + (isLiked ? 1 : 0)}
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
