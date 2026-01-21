"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  Plus,
  Package,
  Eye,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  MapPin,
  MoreVertical,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { listings } from "@prisma/client";

type ListingStatus = "draft" | "active" | "paused" | "archived" | "deleted";

const statusLabels: Record<ListingStatus, string> = {
  draft: "Ноорог",
  active: "Идэвхтэй",
  paused: "Түр зогссон",
  archived: "Архивлагдсан",
  deleted: "Устгагдсан",
};

const statusColors: Record<ListingStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  paused: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  deleted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

type TabValue = "all" | ListingStatus;

interface ListingWithRelations extends listings {
  category?: { name: string; slug: string } | null;
  images?: { id: string; url: string; alt?: string | null }[];
  aimag?: { name: string } | null;
}

export default function MyServicesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<TabValue>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [listingToDelete, setListingToDelete] = React.useState<string | null>(null);

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

  // Redirect to home if not authenticated
  React.useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Фильтрация по табам
  const filteredListings = React.useMemo(() => {
    if (!listings) return [];
    if (activeTab === "all") return listings as ListingWithRelations[];
    return (listings as ListingWithRelations[]).filter((l) => l.status === activeTab);
  }, [listings, activeTab]);

  // Подсчет по статусам
  const counts = React.useMemo(() => {
    if (!listings) return { all: 0, draft: 0, active: 0, paused: 0, archived: 0 };
    const list = listings as ListingWithRelations[];
    return {
      all: list.length,
      draft: list.filter((l) => l.status === "draft").length,
      active: list.filter((l) => l.status === "active").length,
      paused: list.filter((l) => l.status === "paused").length,
      archived: list.filter((l) => l.status === "archived").length,
    };
  }, [listings]);

  // Handlers
  const handleArchive = async (id: string) => {
    try {
      await updateListing({
        where: { id },
        data: { status: "archived" },
      });
      toast.success("Үйлчилгээ архивлагдлаа");
      refetch();
    } catch {
      toast.error("Архивлахад алдаа гарлаа");
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await updateListing({
        where: { id },
        data: { status: "active" },
      });
      toast.success("Үйлчилгээ идэвхжүүллээ");
      refetch();
    } catch {
      toast.error("Идэвхжүүлэхэд алдаа гарлаа");
    }
  };

  const handleDelete = async () => {
    if (!listingToDelete) return;
    try {
      await deleteListing({
        where: { id: listingToDelete },
      });
      toast.success("Үйлчилгээ устгагдлаа");
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

  // Loading state
  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { value: TabValue; label: string; count: number }[] = [
    { value: "all", label: "Бүгд", count: counts.all },
    { value: "active", label: "Идэвхтэй", count: counts.active },
    { value: "draft", label: "Ноорог", count: counts.draft },
    { value: "paused", label: "Түр зогссон", count: counts.paused },
    { value: "archived", label: "Архив", count: counts.archived },
  ];

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
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Миний үйлчилгээнүүд
            </h1>
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <Button asChild>
              <Link href="/services/create">
                <Plus className="h-4 w-4 mr-2" />
                Шинэ үйлчилгээ
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

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4 md:mx-0 md:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoadingListings ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-xl border overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">
              {activeTab === "all"
                ? "Та үйлчилгээ нэмээгүй байна"
                : `${statusLabels[activeTab as ListingStatus]} үйлчилгээ байхгүй`}
            </h2>
            <p className="text-muted-foreground mb-6">
              {activeTab === "all"
                ? "Эхний үйлчилгээгээ нэмж эхлээрэй"
                : "Энэ статустай үйлчилгээ одоогоор байхгүй байна"}
            </p>
            {activeTab === "all" && (
              <Button asChild>
                <Link href="/services/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Үйлчилгээ нэмэх
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing) => {
              const coverImage = listing.images?.[0];
              const status = listing.status as ListingStatus;

              return (
                <div
                  key={listing.id}
                  className="bg-card rounded-xl border overflow-hidden group hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    {coverImage?.url ? (
                      <Image
                        src={coverImage.url}
                        alt={coverImage.alt || listing.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Status Badge */}
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}
                    >
                      {statusLabels[status]}
                    </span>
                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/services/${listing.slug}`} className="flex items-center">
                            <Eye className="h-4 w-4 mr-2" />
                            Харах
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/services/edit/${listing.id}`} className="flex items-center">
                            <Pencil className="h-4 w-4 mr-2" />
                            Засварлах
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {status !== "archived" ? (
                          <DropdownMenuItem
                            onClick={() => handleArchive(listing.id)}
                            disabled={isUpdating}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Архивлах
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleActivate(listing.id)}
                            disabled={isUpdating}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Идэвхжүүлэх
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(listing.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Устгах
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {listing.category && (
                      <span className="text-xs px-2 py-1 bg-muted rounded-full">
                        {listing.category.name}
                      </span>
                    )}
                    <h3 className="font-medium mt-2 line-clamp-1">{listing.title}</h3>
                    <p className="text-primary font-bold text-lg mt-1">
                      {listing.price?.toLocaleString()}₮
                      {listing.is_negotiable && (
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          (тохиролцоно)
                        </span>
                      )}
                    </p>
                    <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                      {listing.aimag && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {listing.aimag.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {listing.views_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Үйлчилгээг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Таны үйлчилгээ бүрмөсөн устгагдах болно.
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
