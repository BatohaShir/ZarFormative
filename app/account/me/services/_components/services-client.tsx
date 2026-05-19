"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Switch } from "@/components/ui/switch";
import { SiteHeader } from "@/components/site-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import {
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
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/auth-context";
import { useFindManylistings, useUpdatelistings, useDeletelistings } from "@/lib/hooks/listings";
import { useFindManylisting_boosts, useCreatelisting_boosts } from "@/lib/hooks/listing-boosts";
import { getQueryKey } from "@zenstackhq/tanstack-query/runtime-v5";
import { formatListingPrice } from "@/lib/utils";
import { deleteAllListingImages } from "@/lib/storage/listings";
import type { listings } from "@prisma/client";
import type { MyServicesSsrData } from "@/lib/profile/my-services-query";

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

// Boost plan → ms. Module-level so it's stable across re-renders
// and shared by ServiceCard / ServicesClient without a prop drill.
const BOOST_DURATIONS: Record<string, number> = {
  "3day": 3 * 24 * 60 * 60 * 1000,
  "7day": 7 * 24 * 60 * 60 * 1000,
  "14day": 14 * 24 * 60 * 60 * 1000,
};

// Single 60s tick shared by every BoostCountdown on the page. With 20
// VIP listings the old component was spinning up 20 intervals + 20
// re-subscribes on every re-render; now there's one timer total and
// each card just reads from a shared useSyncExternalStore.
let tickNow = Date.now();
const tickSubscribers = new Set<() => void>();
let tickInterval: ReturnType<typeof setInterval> | null = null;

function ensureTick() {
  if (tickInterval || typeof window === "undefined") return;
  tickInterval = setInterval(() => {
    tickNow = Date.now();
    for (const s of tickSubscribers) s();
  }, 60_000);
}

function subscribeTick(cb: () => void) {
  tickSubscribers.add(cb);
  ensureTick();
  return () => {
    tickSubscribers.delete(cb);
    if (tickSubscribers.size === 0 && tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  };
}

function getTickSnapshot() {
  return tickNow;
}

function formatBoostTimeLeft(expiresAtMs: number, now: number): string {
  const diff = expiresAtMs - now;
  if (diff <= 0) return "Дууссан";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}ө ${hours}ц`;
  if (hours > 0) return `${hours}ц ${mins}м`;
  return `${mins}м`;
}

// VIP countdown component
function BoostCountdown({ expiresAt }: { expiresAt: string }) {
  const now = React.useSyncExternalStore(subscribeTick, getTickSnapshot, getTickSnapshot);
  const timeLeft = React.useMemo(
    () => formatBoostTimeLeft(new Date(expiresAt).getTime(), now),
    [expiresAt, now]
  );

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
  onEditHover,
  onDelete,
  onBoost,
  activeBoost,
}: {
  listing: ListingWithRelations;
  onToggleActive: (id: string, status: ListingStatus) => void;
  onEdit: (id: string) => void;
  onEditHover: (id: string) => void;
  onDelete: (id: string) => void;
  onBoost: (id: string) => void;
  activeBoost: ActiveBoost | undefined;
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

  const handleEditMouseEnter = React.useCallback(() => {
    onEditHover(listing.id);
  }, [onEditHover, listing.id]);

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
      className="group relative block bg-card rounded-2xl overflow-hidden ring-1 ring-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]"
      style={{ transitionTimingFunction: "var(--ease-brand)" }}
    >
      {/* Image — square */}
      <div className="aspect-square relative overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Status pill */}
        <div
          className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm ${
            isActive ? "bg-emerald-500/90 text-white" : "bg-orange-500/90 text-white"
          }`}
        >
          <span
            className={`w-1 h-1 rounded-full ${isActive ? "bg-white animate-pulse" : "bg-white"}`}
          />
          {isActive ? "Идэвхтэй" : "Идэвхгүй"}
        </div>
      </div>

      {/* Content */}
      <div className="p-2.5 md:p-3 space-y-1.5">
        {listing.category && (
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
            {listing.category.name}
          </span>
        )}

        <h4 className="font-display font-semibold text-sm leading-snug line-clamp-2 min-h-10">
          {listing.title}
        </h4>

        <p className="font-display text-base md:text-[17px] font-bold tabular tracking-tight">
          {priceDisplay}
        </p>

        {/* Stats + location */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1.5 tabular">
            <span className="flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" />
              {listing.views_count || 0}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart className="w-2.5 h-2.5 fill-brand text-brand" />
              {listing.favorites_count || 0}
            </span>
          </div>
          {listing.aimag && (
            <div className="flex items-center gap-1 text-muted-foreground pt-1.5 min-w-0">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span className="text-[10px] truncate">{listing.aimag.name}</span>
            </div>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 pt-2">
            <button
              onClick={handleEdit}
              onMouseEnter={handleEditMouseEnter}
              onFocus={handleEditMouseEnter}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Засварлах"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
              title="Устгах"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 pt-2" onClick={handleToggle}>
            <Switch checked={isActive} className="data-[state=checked]:bg-emerald-500 scale-90" />
          </div>
        </div>
      </div>

      {/* VIP Boost section */}
      {isActive && (
        <div className="border-t border-border px-3 py-2">
          {activeBoost ? (
            <BoostCountdown expiresAt={activeBoost.expires_at} />
          ) : (
            <button
              onClick={handleBoost}
              className="w-full flex items-center justify-center gap-1.5 py-1 rounded-full bg-muted hover:bg-foreground hover:text-background text-foreground text-[11px] font-semibold transition-colors"
            >
              <Crown className="w-3 h-3 fill-amber-400 text-amber-400" />
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
    <div className="flex flex-col items-center justify-center py-20 md:py-24 text-center rounded-2xl bg-muted/40">
      <div className="h-14 w-14 rounded-2xl bg-card ring-1 ring-border flex items-center justify-center mb-5">
        <Package className="h-6 w-6 text-foreground" />
      </div>
      <p className="font-display text-lg font-semibold">{getMessage()}</p>
      <p className="text-muted-foreground text-sm mt-1 max-w-sm">
        Өөрийн үйлчилгээг нэмж, олон хүнд хүргээрэй
      </p>
      <Link
        href="/services/create"
        className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all"
      >
        <Plus className="h-4 w-4" />
        Зар нэмэх
      </Link>
    </div>
  );
});

interface ServicesClientProps {
  /**
   * Server-seeded listings + active boosts from one CTE round-trip.
   * When provided, the client skips its mount-time REST calls and
   * renders the grid immediately.
   */
  ssrData?: MyServicesSsrData;
  /**
   * Current user id as known on the server — see RequestsClient for
   * the same pattern. Passed so the seed below can hash the hook's
   * args on the very first render even if the client-side Supabase
   * auth singleton hasn't resolved yet.
   */
  ssrUserId?: string;
}

export function ServicesClient({ ssrData, ssrUserId }: ServicesClientProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const effectiveUserId = ssrUserId || user?.id || "";
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [listingToDelete, setListingToDelete] = React.useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");

  // Query key для cache updates - используем findMany prefix как ZenStack
  // ZenStack writes findMany cache slots under
  //   ["zenstack", model, op, args, {infinite, optimisticUpdate}]
  // A naive ["listings", "findMany"] prefix never matched and every
  // optimistic toggle / delete silently no-oped. Use the real prefix
  // so setQueriesData / getQueryData hit the live cache row.
  const queryKey = React.useMemo(() => ["zenstack", "listings", "findMany"], []);

  // Show login modal if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

  // Seed React Query from SSR once, before the child hooks run their
  // useQuery. Key off ssrUserId (server-known) so the seed runs on
  // the very first render — without it the useState initializer
  // sees user?.id still null and skips, leaving the hook to issue a
  // cold REST call.
  React.useState(() => {
    if (!ssrData || !ssrUserId) return null;

    const listingsArgs = {
      where: { user_id: ssrUserId },
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
    };

    queryClient.setQueryData(
      getQueryKey("listings", "findMany", listingsArgs),
      ssrData.listings.map((l) => ({
        ...l,
        created_at: new Date(l.created_at),
      }))
    );

    // Boosts key carries a 5-min-rounded threshold that the hook below
    // also computes. Compute it the same way here so the seed hits the
    // exact cache slot the hook will read. If the user stays on the
    // page past the next 5-min boundary the hook will fetch once with
    // the new threshold — expected and fine, only one round-trip.
    const fiveMin = 5 * 60 * 1000;
    const threshold = new Date(Math.floor(Date.now() / fiveMin) * fiveMin).toISOString();
    const boostsArgs = {
      where: {
        user_id: ssrUserId,
        status: "boost_active",
        expires_at: { gt: threshold },
      },
      orderBy: { expires_at: "desc" },
    };
    queryClient.setQueryData(
      getQueryKey("listing_boosts", "findMany", boostsArgs),
      ssrData.activeBoosts.map((b) => ({
        ...b,
        expires_at: new Date(b.expires_at),
        created_at: new Date(b.created_at),
      }))
    );
    return null;
  });

  // Загружаем услуги пользователя
  const { data: listings } = useFindManylistings(
    {
      where: {
        user_id: effectiveUserId,
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
      enabled: !!effectiveUserId,
      staleTime: 30 * 1000,
    }
  );

  // OPTIMIZATION: Round date to 5-min intervals for stable query key.
  // Value changes at next re-render after a 5-min boundary (not on a timer).
  const boostDateThreshold = React.useMemo(() => {
    const fiveMin = 5 * 60 * 1000;
    return new Date(Math.floor(Date.now() / fiveMin) * fiveMin).toISOString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(Date.now() / (5 * 60 * 1000))]);

  // Active boosts via ZenStack
  const { data: activeBoosts } = useFindManylisting_boosts(
    {
      where: {
        user_id: effectiveUserId,
        status: "boost_active",
        expires_at: { gt: boostDateThreshold },
      },
      orderBy: { expires_at: "desc" },
    },
    { enabled: !!effectiveUserId, staleTime: 30 * 1000 }
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

  // Optimistic toggle. The cache flip above is instant — showing a
  // spinner next to the switch while the server round-trip completes
  // is a UX lie (the state the user sees is already the new one).
  // We just fire the mutation in the background and roll back on
  // error. No loading flag needed.
  const handleToggleActive = React.useCallback(
    (id: string, currentStatus: ListingStatus) => {
      const newStatus = currentStatus === "active" ? "paused" : "active";

      queryClient.setQueriesData<ListingWithRelations[]>({ queryKey }, (old) => {
        if (!old) return old;
        return old.map((listing) =>
          listing.id === id ? { ...listing, status: newStatus } : listing
        );
      });

      updateListing({ where: { id }, data: { status: newStatus } })
        .then(() => {
          toast.success(newStatus === "active" ? "Идэвхжүүллээ" : "Түр зогсоолоо");
        })
        .catch(() => {
          queryClient.setQueriesData<ListingWithRelations[]>({ queryKey }, (old) => {
            if (!old) return old;
            return old.map((listing) =>
              listing.id === id ? { ...listing, status: currentStatus } : listing
            );
          });
          toast.error("Алдаа гарлаа");
        });
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

  // Warm the Next.js router cache when the user hovers the edit
  // button. By the time they click the RSC payload is already in
  // memory, so the edit page paints without a cold round-trip.
  const handleEditHover = React.useCallback(
    (id: string) => {
      router.prefetch(`/services/edit/${id}`);
    },
    [router]
  );

  const handleDelete = React.useCallback(async () => {
    if (!listingToDelete || !user?.id) return;
    const id = listingToDelete;

    // Close dialog + drop the card from the grid immediately. The DB
    // delete and storage cleanup run in the background; if DB delete
    // fails we re-insert the snapshot and re-open the dialog with the
    // error toast so the user can retry.
    const snapshot = (queryClient.getQueryData<ListingWithRelations[]>(queryKey) || []).find(
      (l) => l.id === id
    );

    queryClient.setQueriesData<ListingWithRelations[]>({ queryKey }, (old) => {
      if (!old) return old;
      return old.filter((listing) => listing.id !== id);
    });
    setDeleteDialogOpen(false);
    setListingToDelete(null);

    // Delete order matters: DB first so there's never a moment when
    // rows point at a bucket we've already wiped. If DB delete fails,
    // the photos are untouched — safe. If DB delete succeeds and
    // storage fails, we orphan a few files but the row is gone (the
    // orphaned-file cleanup cron will sweep them).
    try {
      await deleteListing({ where: { id } });
      toast.success("Зар устгагдлаа");

      // Storage cleanup in the background. Errors here don't roll
      // back — the DB state is already correct, so we just log.
      void deleteAllListingImages(user.id, id).then((r) => {
        if (r.error) logger.warn("Storage cleanup warning:", r.error);
      });
    } catch (error) {
      console.error("Delete error:", error);
      // Roll back the optimistic removal.
      if (snapshot) {
        queryClient.setQueriesData<ListingWithRelations[]>({ queryKey }, (old) => {
          if (!old) return [snapshot];
          if (old.some((l) => l.id === id)) return old;
          return [snapshot, ...old];
        });
      }
      toast.error("Устгахад алдаа гарлаа");
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

  const openBoostModal = React.useCallback((id: string) => {
    setBoostListingId(id);
    setBoostPlan("3day");
    setBoostSuccess(false);
  }, []);

  const handleBoostSubmit = React.useCallback(async () => {
    if (!boostListingId || !user?.id) return;
    const listingId = boostListingId;
    const plan = boostPlan;
    const duration = BOOST_DURATIONS[plan] || BOOST_DURATIONS["3day"];
    const expiresAt = new Date(Date.now() + duration);

    // Optimistically insert a provisional boost row into every
    // listing_boosts findMany cache entry so the ServiceCard paints
    // the VIP countdown before the server responds. We use a synthetic
    // id; when the real row lands we leave the cache alone — React
    // Query's gcTime keeps the provisional in place until the next
    // findMany fires with a fresh threshold, at which point the
    // background refetch replaces it.
    const provisional = {
      id: `optimistic-${listingId}-${Date.now()}`,
      listing_id: listingId,
      user_id: user.id,
      plan,
      status: "boost_active" as const,
      expires_at: expiresAt,
      created_at: new Date(),
    };
    queryClient.setQueriesData<unknown>(
      { queryKey: ["zenstack", "listing_boosts", "findMany"] },
      (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return [provisional, ...old];
      }
    );

    // Flip the modal to the success screen immediately. The await
    // below just reconciles with the server — by the time it resolves
    // the user has already seen the confirmation.
    setBoostSuccess(true);

    try {
      await createBoost({
        data: {
          listing: { connect: { id: listingId } },
          user: { connect: { id: user.id } },
          plan,
          expires_at: expiresAt,
        },
      });
      // Leave the cache as-is. Any subsequent findMany will return
      // the real row and React Query replaces the provisional.
    } catch (err) {
      // Roll back the optimistic insert.
      queryClient.setQueriesData<unknown>(
        { queryKey: ["zenstack", "listing_boosts", "findMany"] },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return (old as { id: string }[]).filter((b) => b.id !== provisional.id);
        }
      );
      setBoostSuccess(false);

      // The DB has a partial unique index on (listing_id) WHERE
      // status='active', so a second purchase on the same listing
      // (two tabs, stale cache, etc.) returns P2002. Surface it as
      // a product-facing message instead of the generic error.
      const code = (err as { info?: { code?: string } })?.info?.code;
      if (code === "P2002") {
        toast.error("Энэ зар аль хэдийн VIP байна");
      } else {
        toast.error("Алдаа гарлаа");
      }
    }
  }, [boostListingId, boostPlan, user?.id, createBoost, queryClient]);

  // Single pass over listings → buckets by status + total. Reused
  // for both the filter tabs' badge counts and the visible grid,
  // so we never walk the array twice.
  const { filteredListings, counts } = React.useMemo(() => {
    const data = (listings || []) as ListingWithRelations[];
    const active: ListingWithRelations[] = [];
    const paused: ListingWithRelations[] = [];
    for (const l of data) {
      if (l.status === "active") active.push(l);
      else if (l.status === "paused") paused.push(l);
    }
    const visible = filterStatus === "active" ? active : filterStatus === "paused" ? paused : data;
    return {
      filteredListings: visible,
      counts: { all: data.length, active: active.length, paused: paused.length },
    };
  }, [listings, filterStatus]);

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-foreground text-background flex items-center justify-center mx-auto mb-6">
              <Package className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-2">Нэвтэрнэ үү</h2>
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
      <SiteHeader backHref="/" />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Editorial page title + CTA */}
        <div className="flex items-end justify-between gap-3 mb-6 md:mb-8">
          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
              Миний зарууд
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 tabular">{counts.all} зар байна</p>
          </div>
          <Link
            href="/services/create"
            prefetch
            className="shrink-0 inline-flex items-center justify-center gap-2 h-10 md:h-11 px-4 md:px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Шинэ зар</span>
          </Link>
        </div>

        {/* Filter Tabs — editorial pill row */}
        {counts.all > 0 && (
          <Tabs
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
            className="mb-6"
          >
            <TabsList className="w-full grid grid-cols-3 p-1 h-10 md:h-11 bg-muted rounded-full">
              <TabsTrigger
                value="all"
                className="rounded-full px-2 sm:px-3 md:px-4 data-[state=active]:bg-foreground data-[state=active]:text-background text-[11px] sm:text-xs md:text-sm font-medium gap-1 sm:gap-1.5"
              >
                <LayoutGrid className="hidden sm:block h-3.5 w-3.5 md:h-4 md:w-4" />
                Бүгд
                <span className="px-1 sm:px-1.5 py-0.5 rounded-full bg-background/15 text-[9px] sm:text-[10px] md:text-xs font-semibold tabular">
                  {counts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="rounded-full px-2 sm:px-3 md:px-4 data-[state=active]:bg-foreground data-[state=active]:text-background text-[11px] sm:text-xs md:text-sm font-medium gap-1 sm:gap-1.5"
              >
                <CheckCircle className="hidden sm:block h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-500" />
                <span className="hidden sm:inline">Идэвхтэй</span>
                <span className="sm:hidden">Идэвх</span>
                <span className="px-1 sm:px-1.5 py-0.5 rounded-full bg-background/15 text-[9px] sm:text-[10px] md:text-xs font-semibold tabular">
                  {counts.active}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="paused"
                className="rounded-full px-2 sm:px-3 md:px-4 data-[state=active]:bg-foreground data-[state=active]:text-background text-[11px] sm:text-xs md:text-sm font-medium gap-1 sm:gap-1.5"
              >
                <PauseCircle className="hidden sm:block h-3.5 w-3.5 md:h-4 md:w-4 text-orange-500" />
                <span className="hidden sm:inline">Зогсоосон</span>
                <span className="sm:hidden">Зогс</span>
                <span className="px-1 sm:px-1.5 py-0.5 rounded-full bg-background/15 text-[9px] sm:text-[10px] md:text-xs font-semibold tabular">
                  {counts.paused}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Services Grid — SSR seed + React Query initialData mean
            `listings` is already populated on the first render, so we
            go straight to grid or empty state. Next.js loading.tsx
            covers the window while the server CTE is in flight. */}
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filteredListings.map((listing) => (
              <ServiceCard
                key={listing.id}
                listing={listing}
                onToggleActive={handleToggleActive}
                onEdit={handleEdit}
                onEditHover={handleEditHover}
                onDelete={openDeleteDialog}
                onBoost={openBoostModal}
                activeBoost={boostByListing.get(listing.id)}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <EmptyState filter={filterStatus} />
        )}
      </div>

      {/* Delete Confirmation Dialog. handleDelete closes the dialog
          and drops the card before awaiting the server, so no
          disabled/loading state is needed here — if the mutation
          fails we roll back and the user can retry. */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Таны зар болон бүх зургууд бүрмөсөн устгагдах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Устгах
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
