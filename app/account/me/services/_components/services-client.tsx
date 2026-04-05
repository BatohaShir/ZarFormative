"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Package,
  MapPin,
  Eye,
  Loader2,
  Trash2,
  Pencil,
  Plus,
  Heart,
  CheckCircle,
  PauseCircle,
  LayoutGrid,
  Zap,
  X,
  Crown,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useFindManylistings, useUpdatelistings, useDeletelistings } from "@/lib/hooks/listings";
import { useFindManylisting_boosts, useCreatelisting_boosts } from "@/lib/hooks/listing-boosts";
import { formatListingPrice } from "@/lib/utils";
import { deleteAllListingImages } from "@/lib/storage/listings";
import type { listings } from "@prisma/client";

// Lazy load LoginPromptModal
const LoginPromptModal = dynamic(
  () =>
    import("@/components/login-prompt-modal").then((mod) => ({ default: mod.LoginPromptModal })),
  { ssr: false }
);

// Локальный placeholder вместо Unsplash
const PLACEHOLDER_IMAGE = "/images/placeholder-listing.svg";

type ListingStatus = "draft" | "active" | "paused" | "archived" | "deleted";
type FilterStatus = "all" | "active" | "paused";

interface ListingWithRelations extends listings {
  category?: { name: string; slug: string } | null;
  images?: { id: string; url: string; alt?: string | null }[];
  aimag?: { name: string } | null;
}

// Skeleton для загрузки карточки
function ServiceCardSkeleton() {
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

// VIP countdown component
function BoostCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = React.useState("");

  React.useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Дууссан");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (days > 0) setTimeLeft(`${days}ө ${hours}ц`);
      else if (hours > 0) setTimeLeft(`${hours}ц ${mins}м`);
      else setTimeLeft(`${mins}м`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="flex items-center gap-1.5">
      <Crown className="w-3.5 h-3.5 text-amber-500" />
      <span className="text-[10px] md:text-xs font-semibold text-amber-600 dark:text-amber-400">
        VIP
      </span>
      <span className="text-[10px] md:text-xs text-muted-foreground">{timeLeft} үлдсэн</span>
    </div>
  );
}

// Карточка услуги - мемоизированный компонент
interface ActiveBoost {
  id: string;
  listing_id: string;
  expires_at: string;
}

const ServiceCard = React.memo(function ServiceCard({
  listing,
  onToggleActive,
  onEdit,
  onDelete,
  onBoost,
  activeBoost,
  isUpdatingThisCard,
}: {
  listing: ListingWithRelations;
  onToggleActive: (id: string, status: ListingStatus) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onBoost: (id: string) => void;
  activeBoost: ActiveBoost | undefined;
  isUpdatingThisCard: boolean;
}) {
  const imageUrl = listing.images?.[0]?.url || PLACEHOLDER_IMAGE;
  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const status = listing.status as ListingStatus;
  const isActive = status === "active";

  const handleEdit = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onEdit(listing.id);
    },
    [onEdit, listing.id]
  );

  const handleDelete = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(listing.id);
    },
    [onDelete, listing.id]
  );

  const handleToggle = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleActive(listing.id, status);
    },
    [onToggleActive, listing.id, status]
  );

  const handleBoost = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onBoost(listing.id);
    },
    [onBoost, listing.id]
  );

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
        {listing.category && (
          <span className="absolute top-2 left-2 md:top-3 md:left-3 text-[10px] md:text-[11px] bg-white/95 dark:bg-black/80 text-foreground px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium shadow-sm">
            {listing.category.name}
          </span>
        )}

        {/* Status indicator */}
        <div
          className={`absolute top-2 right-2 md:top-3 md:right-3 px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-medium ${
            isActive ? "bg-green-500/90 text-white" : "bg-orange-500/90 text-white"
          }`}
        >
          {isActive ? "Идэвхтэй" : "Идэвхгүй"}
        </div>

        {/* Price */}
        <div className="absolute bottom-2 left-2 right-2 md:bottom-3 md:left-3 md:right-3">
          <p className="text-white font-bold text-base md:text-lg drop-shadow-lg">{priceDisplay}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        <h4 className="font-semibold text-xs md:text-sm line-clamp-1">{listing.title}</h4>
        <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 mt-0.5 md:mt-1">
          {listing.description}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {listing.views_count || 0}
            </span>
            <span className="flex items-center gap-0.5 text-pink-500">
              <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 fill-current" />
              {listing.favorites_count || 0}
            </span>
          </div>
          {listing.aimag && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span className="text-[10px] md:text-[11px] line-clamp-1">{listing.aimag.name}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-1">
            <button
              onClick={handleEdit}
              className="p-1.5 md:p-2 rounded-lg hover:bg-muted transition-colors"
              title="Засварлах"
            >
              <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground hover:text-foreground" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 md:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              title="Устгах"
            >
              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500" />
            </button>
          </div>
          <div className="flex items-center gap-2" onClick={handleToggle}>
            <span className="text-[10px] md:text-xs text-muted-foreground">
              {isActive ? "Идэвхтэй" : "Идэвхгүй"}
            </span>
            <Switch
              checked={isActive}
              disabled={isUpdatingThisCard}
              className="data-[state=checked]:bg-green-500"
            />
            {isUpdatingThisCard && (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* VIP Boost section under card */}
      {isActive && (
        <div className="border-t px-3 md:px-4 py-2.5">
          {activeBoost ? (
            <BoostCountdown expiresAt={activeBoost.expires_at} />
          ) : (
            <button
              onClick={handleBoost}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors"
            >
              <Crown className="w-3.5 h-3.5" />
              VIP зар болгох
            </button>
          )}
        </div>
      )}
    </Link>
  );
});

// Пустое состояние - мемоизированный компонент
const EmptyState = React.memo(function EmptyState({ filter }: { filter: FilterStatus }) {
  const getMessage = () => {
    switch (filter) {
      case "active":
        return "Идэвхтэй зар байхгүй";
      case "paused":
        return "Түр зогсоосон зар байхгүй";
      default:
        return "Зар байхгүй байна";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 mb-6">
        <Package className="h-10 w-10 text-white" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{getMessage()}</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        Өөрийн үйлчилгээг нэмж, олон хүнд хүргээрэй
      </p>
      <Link href="/services/create">
        <Button className="bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" />
          Зар нэмэх
        </Button>
      </Link>
    </div>
  );
});

export function ServicesClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [listingToDelete, setListingToDelete] = React.useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [isDeletingStorage, setIsDeletingStorage] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");

  // Query key для cache updates - используем findMany prefix как ZenStack
  const queryKey = React.useMemo(() => ["listings", "findMany"], []);

  // Show login modal if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

  // Загружаем услуги пользователя
  const { data: listings, isLoading: isLoadingListings } = useFindManylistings(
    {
      where: {
        user_id: user?.id,
      },
      include: {
        category: { select: { name: true, slug: true } },
        images: {
          where: { is_cover: true },
          select: { id: true, url: true, alt: true },
          take: 1,
        },
        aimag: { select: { name: true } },
      },
      orderBy: { created_at: "desc" },
    },
    {
      enabled: !!user?.id,
      staleTime: 30 * 1000,
    }
  );

  // Active boosts via ZenStack
  const { data: activeBoosts } = useFindManylisting_boosts(
    {
      where: {
        user_id: user?.id,
        status: "boost_active",
        expires_at: { gt: new Date().toISOString() },
      },
      orderBy: { expires_at: "desc" },
    },
    { enabled: !!user?.id, staleTime: 30 * 1000 }
  );

  const boostByListing = React.useMemo(() => {
    const map = new Map<string, ActiveBoost>();
    for (const b of activeBoosts || []) {
      const existing = map.get(b.listing_id);
      if (!existing || new Date(b.expires_at) > new Date(existing.expires_at)) {
        map.set(b.listing_id, {
          id: b.id,
          listing_id: b.listing_id,
          expires_at: b.expires_at.toString(),
        });
      }
    }
    return map;
  }, [activeBoosts]);

  // Мутации
  const { mutateAsync: updateListing } = useUpdatelistings();
  const { mutateAsync: deleteListing, isPending: isDeleting } = useDeletelistings();

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

  // Optimistic update для toggle - используем setQueriesData для partial key match
  const handleToggleActive = React.useCallback(
    async (id: string, currentStatus: ListingStatus) => {
      const newStatus = currentStatus === "active" ? "paused" : "active";
      const oldStatus = currentStatus;

      // Set updating ID for this specific card
      setUpdatingId(id);

      // Optimistic update - используем setQueriesData с predicate для partial match
      queryClient.setQueriesData<ListingWithRelations[]>({ queryKey }, (old) => {
        if (!old) return old;
        return old.map((listing) =>
          listing.id === id ? { ...listing, status: newStatus } : listing
        );
      });

      try {
        await updateListing({
          where: { id },
          data: { status: newStatus },
        });
        toast.success(newStatus === "active" ? "Идэвхжүүллээ" : "Түр зогсоолоо");
      } catch {
        // Revert on error
        queryClient.setQueriesData<ListingWithRelations[]>({ queryKey }, (old) => {
          if (!old) return old;
          return old.map((listing) =>
            listing.id === id ? { ...listing, status: oldStatus } : listing
          );
        });
        toast.error("Алдаа гарлаа");
      } finally {
        setUpdatingId(null);
      }
    },
    [updateListing, queryClient, queryKey]
  );

  // SPA навигация вместо full page reload
  const handleEdit = React.useCallback(
    (id: string) => {
      router.push(`/services/edit/${id}`);
    },
    [router]
  );

  const handleDelete = React.useCallback(async () => {
    if (!listingToDelete || !user?.id) return;

    setIsDeletingStorage(true);

    try {
      // 1. Сначала удаляем фото из Supabase Storage
      const storageResult = await deleteAllListingImages(user.id, listingToDelete);
      if (storageResult.error) {
        console.warn("Storage deletion warning:", storageResult.error);
      }

      // 2. Затем удаляем запись из БД
      await deleteListing({
        where: { id: listingToDelete },
      });

      // 3. Удаляем из cache - используем setQueriesData для partial key match
      queryClient.setQueriesData<ListingWithRelations[]>({ queryKey }, (old) => {
        if (!old) return old;
        return old.filter((listing) => listing.id !== listingToDelete);
      });

      toast.success("Зар болон зургууд устгагдлаа");
      setDeleteDialogOpen(false);
      setListingToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Устгахад алдаа гарлаа");
    } finally {
      setIsDeletingStorage(false);
    }
  }, [listingToDelete, user?.id, deleteListing, queryClient, queryKey]);

  const openDeleteDialog = React.useCallback((id: string) => {
    setListingToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  // Boost (VIP) modal
  const [boostListingId, setBoostListingId] = React.useState<string | null>(null);
  const [boostPlan, setBoostPlan] = React.useState("3day");
  const [boostSuccess, setBoostSuccess] = React.useState(false);
  const { mutateAsync: createBoost, isPending: isBoostSubmitting } = useCreatelisting_boosts();

  const BOOST_DURATIONS: Record<string, number> = {
    "3day": 3 * 24 * 60 * 60 * 1000,
    "7day": 7 * 24 * 60 * 60 * 1000,
    "14day": 14 * 24 * 60 * 60 * 1000,
  };

  const openBoostModal = React.useCallback((id: string) => {
    setBoostListingId(id);
    setBoostPlan("3day");
    setBoostSuccess(false);
  }, []);

  const handleBoostSubmit = React.useCallback(async () => {
    if (!boostListingId || !user?.id) return;
    try {
      const duration = BOOST_DURATIONS[boostPlan] || BOOST_DURATIONS["3day"];
      await createBoost({
        data: {
          listing: { connect: { id: boostListingId } },
          user: { connect: { id: user.id } },
          plan: boostPlan,
          expires_at: new Date(Date.now() + duration),
        },
      });
      setBoostSuccess(true);
      // Invalidate boosts cache
      queryClient.invalidateQueries({ queryKey: ["listing_boosts"] });
    } catch {
      toast.error("Алдаа гарлаа");
    }
  }, [boostListingId, boostPlan, user?.id, createBoost, queryClient]);

  // Мемоизированный фильтрованный список
  const filteredListings = React.useMemo(() => {
    const data = (listings || []) as ListingWithRelations[];
    if (filterStatus === "all") return data;
    if (filterStatus === "active") return data.filter((l) => l.status === "active");
    if (filterStatus === "paused") return data.filter((l) => l.status === "paused");
    return data;
  }, [listings, filterStatus]);

  // Counts for tabs
  const counts = React.useMemo(() => {
    const data = (listings || []) as ListingWithRelations[];
    return {
      all: data.length,
      active: data.filter((l) => l.status === "active").length,
      paused: data.filter((l) => l.status === "paused").length,
    };
  }, [listings]);

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 mx-auto mb-6">
              <Package className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Нэвтэрнэ үү</h2>
            <p className="text-muted-foreground text-sm">
              Өөрийн зарууддаа хандахын тулд нэвтрэх шаардлагатай
            </p>
          </div>
        </div>
        {showLoginModal && (
          <LoginPromptModal
            open={showLoginModal}
            onOpenChange={handleLoginModalClose}
            onSuccess={handleLoginSuccess}
            title="Миний зарууд"
            description="Өөрийн зарууддаа хандахын тулд нэвтрэх шаардлагатай."
            icon={Package}
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
            <Button size="sm" asChild>
              <Link href="/services/create">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <Button asChild>
              <Link href="/services/create">
                <Plus className="h-4 w-4 mr-2" />
                Шинэ зар
              </Link>
            </Button>
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
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <Package className="h-6 w-6 md:h-7 md:w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold">Миний зарууд</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {isLoadingListings ? "Ачааллаж байна..." : `${counts.all} зар байна`}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        {!isLoadingListings && counts.all > 0 && (
          <Tabs
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
            className="mb-6"
          >
            <TabsList className="w-full grid grid-cols-3 p-1 h-9 md:h-10 bg-muted/50 rounded-full">
              <TabsTrigger
                value="all"
                className="rounded-full px-2 sm:px-3 md:px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm text-[11px] sm:text-xs md:text-sm font-medium gap-1 sm:gap-1.5"
              >
                <LayoutGrid className="hidden sm:block h-3.5 w-3.5 md:h-4 md:w-4" />
                Бүгд
                <span className="px-1 sm:px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] sm:text-[10px] md:text-xs font-semibold">
                  {counts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="rounded-full px-2 sm:px-3 md:px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm text-[11px] sm:text-xs md:text-sm font-medium gap-1 sm:gap-1.5"
              >
                <CheckCircle className="hidden sm:block h-3.5 w-3.5 md:h-4 md:w-4 text-green-500" />
                <span className="hidden sm:inline">Идэвхтэй</span>
                <span className="sm:hidden">Идэвх</span>
                <span className="px-1 sm:px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[9px] sm:text-[10px] md:text-xs font-semibold">
                  {counts.active}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="paused"
                className="rounded-full px-2 sm:px-3 md:px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm text-[11px] sm:text-xs md:text-sm font-medium gap-1 sm:gap-1.5"
              >
                <PauseCircle className="hidden sm:block h-3.5 w-3.5 md:h-4 md:w-4 text-orange-500" />
                <span className="hidden sm:inline">Зогсоосон</span>
                <span className="sm:hidden">Зогс</span>
                <span className="px-1 sm:px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 text-[9px] sm:text-[10px] md:text-xs font-semibold">
                  {counts.paused}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Loading State */}
        {isLoadingListings ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredListings.length > 0 ? (
          /* Services Grid */
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredListings.map((listing) => (
              <ServiceCard
                key={listing.id}
                listing={listing}
                onToggleActive={handleToggleActive}
                onEdit={handleEdit}
                onDelete={openDeleteDialog}
                onBoost={openBoostModal}
                activeBoost={boostByListing.get(listing.id)}
                isUpdatingThisCard={updatingId === listing.id}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <EmptyState filter={filterStatus} />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeletingStorage && !isDeleting) {
            setDeleteDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Таны зар болон бүх зургууд бүрмөсөн устгагдах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingStorage || isDeleting}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeletingStorage || isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingStorage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Зураг устгаж байна...
                </>
              ) : isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Зар устгаж байна...
                </>
              ) : (
                "Устгах"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* VIP Boost Modal */}
      {boostListingId && !boostSuccess && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-lg">VIP зар болгох</h2>
              </div>
              <button
                onClick={() => setBoostListingId(null)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <label className="text-sm font-medium mb-1 block">Багц сонгох</label>
              {[
                { id: "3day", label: "3 хоног", desc: "72 цагийн турш VIP", price: "10,000₮" },
                { id: "7day", label: "7 хоног", desc: "1 долоо хоног VIP", price: "18,000₮" },
                { id: "14day", label: "14 хоног", desc: "2 долоо хоног VIP", price: "30,000₮" },
              ].map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${boostPlan === p.id ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-border hover:border-amber-500/40"}`}
                >
                  <input
                    type="radio"
                    name="boost-plan"
                    checked={boostPlan === p.id}
                    onChange={() => setBoostPlan(p.id)}
                    className="accent-amber-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                  <span className="font-bold text-amber-600">{p.price}</span>
                </label>
              ))}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={handleBoostSubmit}
                disabled={isBoostSubmitting}
                className="w-full h-11 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBoostSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Оруулж байна...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Төлбөр төлөх
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boost Success Modal */}
      {boostSuccess && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-center p-8 relative">
            <button
              onClick={() => {
                setBoostListingId(null);
                setBoostSuccess(false);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Амжилттай!</h2>
            <p className="text-sm text-muted-foreground">Таны зар VIP болгогдлоо</p>
          </div>
        </div>
      )}
    </div>
  );
}
