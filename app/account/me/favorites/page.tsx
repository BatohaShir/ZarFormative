"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  Heart,
  MapPin,
  Eye,
  Loader2,
  Trash2,
  Undo2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFavoriteIds, useFavoriteActions, useFavoritesFullData, type FavoriteWithListing } from "@/contexts/favorites-context";
import { formatListingPrice } from "@/lib/utils";
import { toast } from "sonner";

// Lazy load LoginPromptModal - not loaded until needed
const LoginPromptModal = dynamic(
  () => import("@/components/login-prompt-modal").then((mod) => ({ default: mod.LoginPromptModal })),
  { ssr: false }
);

// Локальный placeholder вместо Unsplash
const PLACEHOLDER_IMAGE = "/images/placeholder-listing.svg";

// Skeleton для загрузки
function FavoriteCardSkeleton() {
  return (
    <div className="rounded-xl md:rounded-2xl overflow-hidden border">
      <Skeleton className="aspect-4/3" />
      <div className="p-3 md:p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

// Карточка избранного - мемоизирована для предотвращения лишних ре-рендеров
const FavoriteCard = React.memo(function FavoriteCard({
  favorite,
  onRemove,
}: {
  favorite: FavoriteWithListing;
  onRemove: (id: string, title: string) => void;
}) {
  const listing = favorite.listing;
  const imageUrl = listing.images?.[0]?.url || PLACEHOLDER_IMAGE;
  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);

  // Получить имя провайдера
  const providerName = React.useMemo(() => {
    const user = listing.user;
    if (user.first_name || user.last_name) {
      return [user.first_name, user.last_name].filter(Boolean).join(" ");
    }
    return "Хэрэглэгч";
  }, [listing.user]);

  const handleRemove = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(listing.id, listing.title);
  }, [onRemove, listing.id, listing.title]);

  return (
    <Link
      href={`/services/${listing.slug}`}
      className="cursor-pointer group relative bg-card rounded-xl md:rounded-2xl overflow-hidden border hover:border-primary/30 hover:shadow-xl transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-4/3 relative overflow-hidden">
        <Image
          src={imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />

        {/* Category badge */}
        <span className="absolute top-2 left-2 md:top-3 md:left-3 text-[10px] md:text-[11px] bg-white/95 dark:bg-black/80 text-foreground px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium shadow-sm">
          {listing.category.name}
        </span>

        {/* Remove button */}
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 md:p-2 rounded-full bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black transition-colors shadow-sm group/btn"
          title="Хасах"
        >
          <Heart className="w-4 h-4 md:w-5 md:h-5 fill-pink-500 text-pink-500 group-hover/btn:hidden" />
          <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-500 hidden group-hover/btn:block" />
        </button>

        {/* Price */}
        <div className="absolute bottom-2 left-2 right-2 md:bottom-3 md:left-3 md:right-3">
          <p className="text-white font-bold text-base md:text-lg drop-shadow-lg">
            {priceDisplay}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        <h4 className="font-semibold text-xs md:text-sm line-clamp-1">
          {listing.title}
        </h4>
        <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 mt-0.5 md:mt-1">
          {listing.description}
        </p>

        {/* Provider */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 md:gap-2">
            {listing.user.avatar_url ? (
              <Image
                src={listing.user.avatar_url}
                alt={providerName}
                width={20}
                height={20}
                unoptimized={listing.user.avatar_url.includes("dicebear")}
                className="rounded-full object-cover w-4 h-4 md:w-5 md:h-5"
              />
            ) : (
              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] md:text-[10px] font-medium text-primary">
                {providerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[10px] md:text-xs text-primary font-medium line-clamp-1">
              {providerName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {listing.views_count}
            </span>
            <span className="flex items-center gap-0.5 text-pink-500">
              <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 fill-current" />
              {listing.favorites_count}
            </span>
          </div>
        </div>

        {listing.aimag && (
          <div className="flex items-center gap-1 mt-1.5 md:mt-2 text-muted-foreground">
            <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
            <span className="text-[10px] md:text-[11px] line-clamp-1">
              {listing.aimag.name}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
});

// Пустое состояние
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/25 mb-6">
        <Heart className="h-10 w-10 text-white" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Таалагдсан зүйлс хоосон байна</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        Үйлчилгээнүүдийг үзэж, зүрхэн дээр дарж таалагдсан зүйлсээ хадгалаарай
      </p>
      <Link href="/">
        <Button className="bg-linear-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg shadow-pink-500/25">
          <Heart className="h-4 w-4 mr-2" />
          Үйлчилгээ хайх
        </Button>
      </Link>
    </div>
  );
}

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  // OPTIMIZATION: Используем разделённые хуки для лучшей производительности
  const { count } = useFavoriteIds();
  const { toggleFavorite, isToggling } = useFavoriteActions();
  // Полные данные загружаются ТОЛЬКО на этой странице (не на главной)
  const { favorites, isLoading } = useFavoritesFullData();
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

  const handleLoginModalClose = React.useCallback((open: boolean) => {
    if (!open && !isAuthenticated) {
      router.push("/");
    } else {
      setShowLoginModal(open);
    }
  }, [isAuthenticated, router]);

  // Remove favorite with Undo toast
  const handleRemoveFavorite = React.useCallback((listingId: string, title: string) => {
    // Optimistically remove (context already handles this)
    toggleFavorite(listingId);

    // Show toast
    toast.success(
      <div className="flex items-center gap-2">
        <span className="truncate max-w-50">&quot;{title}&quot; хасагдлаа</span>
      </div>,
      {
        duration: 3000,
        icon: <Heart className="w-4 h-4 text-pink-500" />,
      }
    );
  }, [toggleFavorite]);

  // Не авторизован
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/25 mx-auto mb-6">
              <Heart className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Нэвтэрнэ үү</h2>
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
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
            <Link href="/">
              <h1 className="text-lg md:text-2xl font-bold">
                <span className="text-[#015197]">Tsogts</span>
                <span className="text-[#c4272f]">.mn</span>
              </h1>
            </Link>
          </div>
          {/* Mobile Nav */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
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

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Page Title */}
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-linear-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
            <Heart className="h-6 w-6 md:h-7 md:w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold">Таалагдсан</h2>
              {isToggling && (
                <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Ачааллаж байна..." : `${count} үйлчилгээ хадгалсан`}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <FavoriteCardSkeleton key={i} />
            ))}
          </div>
        ) : favorites.length > 0 ? (
          /* Favorites Grid */
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {favorites.map((favorite) => (
              <FavoriteCard
                key={favorite.id}
                favorite={favorite}
                onRemove={handleRemoveFavorite}
              />
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
