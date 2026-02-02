"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  useFindManylistings,
  useUpdatelistings,
  useDeletelistings,
} from "@/lib/hooks/listings";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  Search,
  Loader2,
  Package,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  ChevronDown,
  Check,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Clock,
  Pause,
  Archive,
  Play,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Типы статусов
type ListingStatus = "draft" | "active" | "paused" | "archived" | "deleted";

// Тип листинга
type Listing = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: ListingStatus;
  is_active: boolean;
  views_count: number;
  favorites_count: number;
  created_at: Date;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    is_company: boolean;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  images: Array<{
    id: string;
    url: string;
    sort_order: number;
  }>;
};

// Информация о статусах
const STATUS_INFO: Record<ListingStatus, { label: string; icon: typeof Package; color: string }> = {
  draft: {
    label: "Черновик",
    icon: Clock,
    color: "text-gray-600 bg-gray-100 dark:bg-gray-800",
  },
  active: {
    label: "Активно",
    icon: Play,
    color: "text-green-600 bg-green-100 dark:bg-green-900/30",
  },
  paused: {
    label: "Приостановлено",
    icon: Pause,
    color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
  },
  archived: {
    label: "В архиве",
    icon: Archive,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  },
  deleted: {
    label: "Удалено",
    icon: Trash2,
    color: "text-red-600 bg-red-100 dark:bg-red-900/30",
  },
};

// Skeleton компонент
function ListingRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="w-16 h-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export default function ListingsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "all">("all");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch listings с include
  const { data: listings, isLoading, refetch } = useFindManylistings(
    {
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            company_name: true,
            is_company: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            sort_order: true,
          },
          orderBy: { sort_order: "asc" },
          take: 1,
        },
      },
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  // Mutations
  const updateMutation = useUpdatelistings();
  const deleteMutation = useDeletelistings();

  // Realtime подписка
  const refetchListings = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["listings"] });
    queryClient.refetchQueries({ queryKey: ["listings"], type: "active" });
  }, [queryClient]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-listings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log("[Admin Listings] Listing changed:", payload.eventType);
          refetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchListings]);

  // Фильтрация
  const filteredListings = (listings || []).filter((listing) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      listing.title.toLowerCase().includes(searchLower) ||
      listing.slug.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "all" || listing.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Изменение статуса
  const handleStatusChange = async (listingId: string, newStatus: ListingStatus) => {
    try {
      await updateMutation.mutateAsync({
        where: { id: listingId },
        data: { status: newStatus },
      });
      setOpenDropdown(null);
      refetch();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Toggle is_active
  const handleToggleActive = async (listing: Listing) => {
    try {
      await updateMutation.mutateAsync({
        where: { id: listing.id },
        data: { is_active: !listing.is_active },
      });
      refetch();
    } catch (error) {
      console.error("Error toggling active:", error);
    }
  };

  // Удаление
  const handleDelete = async (listing: Listing) => {
    if (deleteConfirm !== listing.id) {
      setDeleteConfirm(listing.id);
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        where: { id: listing.id },
      });
      setDeleteConfirm(null);
      refetch();
    } catch (error) {
      console.error("Error deleting listing:", error);
    }
  };

  // Статистика
  const stats = {
    total: listings?.length || 0,
    active: listings?.filter((l) => l.status === "active").length || 0,
    draft: listings?.filter((l) => l.status === "draft").length || 0,
    paused: listings?.filter((l) => l.status === "paused").length || 0,
  };

  // Получить имя владельца
  const getOwnerName = (listing: Listing) => {
    if (!listing.user) return "Неизвестно";
    if (listing.user.is_company) {
      return listing.user.company_name || "Компани";
    }
    const name = `${listing.user.first_name || ""} ${listing.user.last_name || ""}`.trim();
    return name || "Хэрэглэгч";
  };

  // Render image
  const renderImage = (listing: Listing) => {
    const image = listing.images?.[0];

    if (image?.url) {
      return (
        <div className="w-16 h-12 rounded-lg overflow-hidden relative bg-gray-100 dark:bg-gray-800">
          <Image
            src={image.url}
            alt={listing.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      );
    }

    return (
      <div className="w-16 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Package className="h-5 w-5 text-gray-400" />
      </div>
    );
  };

  // Render status dropdown
  const renderStatusDropdown = (listing: Listing) => {
    const isOpen = openDropdown === listing.id;
    const statusInfo = STATUS_INFO[listing.status];
    const Icon = statusInfo.icon;

    return (
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : listing.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            statusInfo.color,
            "hover:opacity-80"
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{statusInfo.label}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpenDropdown(null)}
            />
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 min-w-[160px] py-1">
              {(Object.keys(STATUS_INFO) as ListingStatus[]).map((status) => {
                const info = STATUS_INFO[status];
                const StatusIcon = info.icon;
                const isSelected = listing.status === status;

                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(listing.id, status)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                      isSelected && "bg-gray-50 dark:bg-gray-800/50"
                    )}
                    disabled={updateMutation.isPending}
                  >
                    <StatusIcon className={cn("h-4 w-4", info.color.split(" ")[0])} />
                    <span className="flex-1 text-left">{info.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-green-500" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Услуги
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Модерация объявлений и услуг
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-sm text-gray-500">Всего</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-green-600">
            {stats.active}
          </div>
          <div className="text-sm text-gray-500">Активных</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-600">
            {stats.draft}
          </div>
          <div className="text-sm text-gray-500">Черновиков</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.paused}
          </div>
          <div className="text-sm text-gray-500">Приостановлено</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          />
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "draft", "paused", "archived", "deleted"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                statusFilter === status
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {status === "all" ? "Все" : STATUS_INFO[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Listings list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <ListingRowSkeleton key={i} />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="h-12 w-12 mb-4 text-gray-300" />
            <p>Объявления не найдены</p>
          </div>
        ) : (
          <div>
            {filteredListings.map((listing) => {
              const isDeleting = deleteConfirm === listing.id;

              return (
                <div
                  key={listing.id}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                    !listing.is_active && "opacity-60"
                  )}
                >
                  {/* Image */}
                  {renderImage(listing as Listing)}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {listing.title}
                      </span>
                      {!listing.is_active && (
                        <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded">
                          скрыто
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                      <span>{getOwnerName(listing as Listing)}</span>
                      {listing.category && (
                        <span className="text-gray-400">• {listing.category.name}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {listing.views_count}
                      </span>
                    </div>
                  </div>

                  {/* Status dropdown */}
                  {renderStatusDropdown(listing as Listing)}

                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggleActive(listing as Listing)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      listing.is_active
                        ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    title={listing.is_active ? "Скрыть" : "Показать"}
                  >
                    {listing.is_active ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>

                  {/* View link */}
                  <Link
                    href={`/listings/${listing.slug}`}
                    target="_blank"
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Открыть"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(listing as Listing)}
                    onBlur={() => setTimeout(() => setDeleteConfirm(null), 200)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isDeleting
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                        : "text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    title={isDeleting ? "Нажмите ещё раз для подтверждения" : "Удалить"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
