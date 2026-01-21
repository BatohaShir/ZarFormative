"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  Package,
  MapPin,
  Eye,
  Loader2,
  Trash2,
  Pencil,
  Plus,
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
import { formatListingPrice } from "@/lib/utils";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import type { listings } from "@prisma/client";

type ListingStatus = "draft" | "active" | "paused" | "archived" | "deleted";

interface ListingWithRelations extends listings {
  category?: { name: string; slug: string } | null;
  images?: { id: string; url: string; alt?: string | null }[];
  aimag?: { name: string } | null;
}

// Skeleton для загрузки
function ServiceCardSkeleton() {
  return (
    <div className="rounded-xl md:rounded-2xl overflow-hidden border">
      <Skeleton className="aspect-4/3" />
      <div className="p-3 md:p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-10" />
        </div>
      </div>
    </div>
  );
}

// Карточка услуги
function ServiceCard({
  listing,
  onToggleActive,
  onDelete,
  isUpdating,
}: {
  listing: ListingWithRelations;
  onToggleActive: (id: string, status: ListingStatus) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}) {
  const imageUrl = listing.images?.[0]?.url || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=300&fit=crop";
  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const status = listing.status as ListingStatus;
  const isActive = status === "active";

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleActive(listing.id, status);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(listing.id);
  };

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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Category badge */}
        {listing.category && (
          <span className="absolute top-2 left-2 md:top-3 md:left-3 text-[10px] md:text-[11px] bg-white/95 dark:bg-black/80 text-foreground px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium shadow-sm">
            {listing.category.name}
          </span>
        )}

        {/* Status badge */}
        <span className={`absolute top-2 right-2 md:top-3 md:right-3 text-[10px] md:text-[11px] px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium shadow-sm ${
          isActive
            ? "bg-green-500/90 text-white"
            : "bg-orange-500/90 text-white"
        }`}>
          {isActive ? "Идэвхтэй" : "Түр зогссон"}
        </span>

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

        {/* Stats */}
        <div className="flex items-center gap-2 mt-2 text-[9px] md:text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Eye className="w-2.5 h-2.5 md:w-3 md:h-3" />
            {listing.views_count || 0}
          </span>
          {listing.aimag && (
            <span className="flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {listing.aimag.name}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          {/* Active toggle */}
          <div className="flex items-center gap-2" onClick={handleToggle}>
            <Switch
              checked={isActive}
              disabled={isUpdating}
              className="data-[state=checked]:bg-green-500"
            />
            <span className="text-[10px] md:text-xs text-muted-foreground">
              {isActive ? "Идэвхтэй" : "Идэвхгүй"}
            </span>
          </div>

          {/* Edit & Delete */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/services/edit/${listing.id}`;
              }}
              className="p-1.5 md:p-2 rounded-full hover:bg-muted transition-colors"
              title="Засварлах"
            >
              <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 md:p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              title="Устгах"
            >
              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Пустое состояние
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 mb-6">
        <Package className="h-10 w-10 text-white" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Зар байхгүй байна</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        Өөрийн үйлчилгээг нэмж, олон хүнд хүргээрэй
      </p>
      <Link href="/services/create">
        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" />
          Зар нэмэх
        </Button>
      </Link>
    </div>
  );
}

export default function MyServicesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [listingToDelete, setListingToDelete] = React.useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = React.useState(false);

  // Show login modal if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

  // Загружаем услуги пользователя
  const { data: listings, isLoading: isLoadingListings, refetch } = useFindManylistings(
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

  // Мутации
  const { mutateAsync: updateListing, isPending: isUpdating } = useUpdatelistings();
  const { mutateAsync: deleteListing, isPending: isDeleting } = useDeletelistings();

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
  };

  const handleLoginModalClose = (open: boolean) => {
    if (!open && !isAuthenticated) {
      router.push("/");
    } else {
      setShowLoginModal(open);
    }
  };

  // Handlers
  const handleToggleActive = async (id: string, currentStatus: ListingStatus) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await updateListing({
        where: { id },
        data: { status: newStatus },
      });
      toast.success(newStatus === "active" ? "Идэвхжүүллээ" : "Түр зогсоолоо");
      refetch();
    } catch {
      toast.error("Алдаа гарлаа");
    }
  };

  const handleDelete = async () => {
    if (!listingToDelete) return;
    try {
      await deleteListing({
        where: { id: listingToDelete },
      });
      toast.success("Устгагдлаа");
      setDeleteDialogOpen(false);
      setListingToDelete(null);
      refetch();
    } catch {
      toast.error("Устгахад алдаа гарлаа");
    }
  };

  const openDeleteDialog = (id: string) => {
    setListingToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 mx-auto mb-6">
              <Package className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Нэвтэрнэ үү</h2>
            <p className="text-muted-foreground text-sm">
              Өөрийн зарууддаа хандахын тулд нэвтрэх шаардлагатай
            </p>
          </div>
        </div>
        <LoginPromptModal
          open={showLoginModal}
          onOpenChange={handleLoginModalClose}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  const listingsData = (listings || []) as ListingWithRelations[];
  const count = listingsData.length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Link href="/">
              <h1 className="text-lg md:text-2xl font-bold">
                <span className="text-[#c4272f]">Uilc</span>
                <span className="text-[#015197]">hilge</span>
                <span className="text-[#c4272f]">e.mn</span>
              </h1>
            </Link>
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <Button asChild>
              <Link href="/services/create">
                <Plus className="h-4 w-4 mr-2" />
                Шинэ зар
              </Link>
            </Button>
            <RequestsButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
          {/* Mobile Add Button */}
          <Button size="sm" className="md:hidden" asChild>
            <Link href="/services/create">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Page Title */}
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <Package className="h-6 w-6 md:h-7 md:w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold">Миний зарууд</h2>
              {isUpdating && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isLoadingListings ? "Ачааллаж байна..." : `${count} зар байна`}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingListings ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : listingsData.length > 0 ? (
          /* Services Grid */
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {listingsData.map((listing) => (
              <ServiceCard
                key={listing.id}
                listing={listing}
                onToggleActive={handleToggleActive}
                onDelete={openDeleteDialog}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <EmptyState />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Таны зар бүрмөсөн устгагдах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Устгаж байна...
                </>
              ) : (
                "Устгах"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
