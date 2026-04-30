"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Send,
  Inbox,
  Play,
  Loader2,
  Clock,
  CheckCircle,
  User,
  MapPin,
  Calendar,
  MessageSquare,
  CreditCard,
  X,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFindManylisting_requests,
  useDeletelisting_requests,
  useCreateManynotifications,
} from "@/lib/hooks";
import { getQueryKey } from "@zenstackhq/tanstack-query/runtime-v5";
import { CACHE_TIMES } from "@/lib/react-query-config";
import { useRealtimeRequests } from "@/hooks/use-realtime-requests";
import { useStatusTransition } from "./use-status-transition";
import {
  RequestListItem,
  type RequestWithRelations,
  type RequestActions,
  getPersonName,
  getListingImage,
  checkRequestOverdue,
} from ".";
import { reviveRequest, type RequestsPageData } from "@/lib/requests/list-query";

/**
 * Single source of truth for the findMany args used by the list
 * query hook AND by the SSR cache seed above. Extracting keeps the
 * two in lockstep — the query key ZenStack builds from these args
 * must hash identically, otherwise the seed lands in a dead cache
 * slot and the hook fires a cold REST call.
 */
const REQUEST_LIST_ARGS_FOR_USER = (userId: string) => ({
  where: {
    OR: [{ client_id: userId }, { provider_id: userId }],
  },
  select: {
    id: true,
    listing_id: true,
    client_id: true,
    provider_id: true,
    message: true,
    status: true,
    provider_response: true,
    image_url: true,
    preferred_date: true,
    preferred_time: true,
    created_at: true,
    updated_at: true,
    accepted_at: true,
    started_at: true,
    completed_at: true,
    completion_description: true,
    completion_photos: true,
    proposed_price: true,
    aimag_id: true,
    district_id: true,
    khoroo_id: true,
    address_detail: true,
    latitude: true,
    longitude: true,
    client_phone: true,
    listing: {
      select: {
        id: true,
        title: true,
        slug: true,
        service_type: true,
        address: true,
        price: true,
        is_negotiable: true,
        phone: true,
        images: {
          select: { url: true, is_cover: true },
          take: 1,
          orderBy: { is_cover: "desc" as const },
        },
      },
    },
    client: {
      select: {
        id: true,
        first_name: true,
        last_name: true,
        company_name: true,
        is_company: true,
        avatar_url: true,
      },
    },
    provider: {
      select: {
        id: true,
        first_name: true,
        last_name: true,
        company_name: true,
        is_company: true,
        avatar_url: true,
      },
    },
    aimag: { select: { id: true, name: true } },
    district: { select: { id: true, name: true } },
    khoroo: { select: { id: true, name: true } },
    review: {
      select: {
        id: true,
        rating: true,
        comment: true,
        created_at: true,
      },
    },
  },
  orderBy: { created_at: "desc" as const },
});

// Lazy load heavy components
// Lazy import the detail modal. The shared loader is reused by
// `warmDetailModal` so a hover/touchstart on a list item starts the
// chunk download before the user clicks — by the time the click
// fires, the module is already in memory and the modal renders
// without the lazy-loader's transient null frame.
const detailModalLoader = () =>
  import("./request-detail-modal").then((mod) => ({ default: mod.RequestDetailModal }));
const RequestDetailModal = dynamic(detailModalLoader, { ssr: false });

let detailModalWarmed = false;
const warmDetailModal = () => {
  if (detailModalWarmed) return;
  detailModalWarmed = true;
  // Fire-and-forget; if it fails, the real import will retry on click.
  detailModalLoader().catch(() => {
    detailModalWarmed = false;
  });
};

const ElapsedTimeCounter = dynamic(
  () =>
    import("@/components/elapsed-time-counter").then((mod) => ({
      default: mod.ElapsedTimeCounter,
    })),
  { ssr: false }
);

// ActiveRequestsSidebar removed - replaced by "Ажилд" tab

// MobileActiveRequestsButton removed - replaced by "Ажилд" tab

// Empty state — matches services-client EmptyState (rounded-2xl bg-muted/40)
const EmptyState = React.memo(function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 md:py-24 text-center rounded-2xl bg-muted/40">
      <div className="h-14 w-14 rounded-2xl bg-card ring-1 ring-border flex items-center justify-center mb-5 text-foreground">
        {icon}
      </div>
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="text-muted-foreground text-sm mt-1 max-w-sm px-6">{description}</p>
    </div>
  );
});

// Loading skeleton — editorial: rounded-2xl ring-1 ring-border
function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card rounded-2xl ring-1 ring-border p-4 flex gap-3">
          <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// OPTIMIZATION: useReducer for complex state management instead of multiple useState
type RequestsPageState = {
  searchInput: string;
  searchQuery: string;
  selectedRequest: RequestWithRelations | null;
  deleteDialogOpen: boolean;
  requestToDelete: string | null;
  startWorkDialogOpen: boolean;
  requestToStart: string | null;
  shouldOpenChat: boolean;
  shouldOpenCompletionForm: boolean;
  shouldOpenQRPayment: boolean;
};

type RequestsPageAction =
  | { type: "SET_SEARCH_INPUT"; payload: string }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_SELECTED_REQUEST"; payload: RequestWithRelations | null }
  | { type: "OPEN_DELETE_DIALOG"; payload: string }
  | { type: "CLOSE_DELETE_DIALOG" }
  | { type: "OPEN_START_WORK_DIALOG"; payload: string }
  | { type: "CLOSE_START_WORK_DIALOG" }
  | { type: "SET_SHOULD_OPEN_CHAT"; payload: boolean }
  | { type: "SET_SHOULD_OPEN_COMPLETION_FORM"; payload: boolean }
  | { type: "SET_SHOULD_OPEN_QR_PAYMENT"; payload: boolean }
  | { type: "OPEN_CHAT_FOR_REQUEST"; payload: RequestWithRelations }
  | { type: "OPEN_COMPLETION_FOR_REQUEST"; payload: RequestWithRelations }
  | { type: "OPEN_QR_FOR_REQUEST"; payload: RequestWithRelations }
  | { type: "CLOSE_MODAL" };

const initialState: RequestsPageState = {
  searchInput: "",
  searchQuery: "",
  selectedRequest: null,
  deleteDialogOpen: false,
  requestToDelete: null,
  startWorkDialogOpen: false,
  requestToStart: null,
  shouldOpenChat: false,
  shouldOpenCompletionForm: false,
  shouldOpenQRPayment: false,
};

function requestsReducer(state: RequestsPageState, action: RequestsPageAction): RequestsPageState {
  switch (action.type) {
    case "SET_SEARCH_INPUT":
      return { ...state, searchInput: action.payload };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };
    case "SET_SELECTED_REQUEST":
      return { ...state, selectedRequest: action.payload };
    case "OPEN_DELETE_DIALOG":
      return { ...state, deleteDialogOpen: true, requestToDelete: action.payload };
    case "CLOSE_DELETE_DIALOG":
      return { ...state, deleteDialogOpen: false, requestToDelete: null };
    case "OPEN_START_WORK_DIALOG":
      return { ...state, startWorkDialogOpen: true, requestToStart: action.payload };
    case "CLOSE_START_WORK_DIALOG":
      return { ...state, startWorkDialogOpen: false, requestToStart: null };
    case "SET_SHOULD_OPEN_CHAT":
      return { ...state, shouldOpenChat: action.payload };
    case "SET_SHOULD_OPEN_COMPLETION_FORM":
      return { ...state, shouldOpenCompletionForm: action.payload };
    case "SET_SHOULD_OPEN_QR_PAYMENT":
      return { ...state, shouldOpenQRPayment: action.payload };
    case "OPEN_CHAT_FOR_REQUEST":
      return { ...state, selectedRequest: action.payload, shouldOpenChat: true };
    case "OPEN_COMPLETION_FOR_REQUEST":
      return { ...state, selectedRequest: action.payload, shouldOpenCompletionForm: true };
    case "OPEN_QR_FOR_REQUEST":
      return { ...state, selectedRequest: action.payload, shouldOpenQRPayment: true };
    case "CLOSE_MODAL":
      return { ...state, selectedRequest: null };
    default:
      return state;
  }
}

function RequestsPageContent({
  ssrData,
  ssrUserId,
}: {
  ssrData?: RequestsPageData;
  ssrUserId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Seed React Query with the SSR payload before the findMany below
  // mounts. Keying on ssrUserId (server-known) rather than user?.id
  // from the client auth singleton — the singleton hydrates async,
  // so by the time it resolves this useState initializer has already
  // run and skipped. The hook would then fire a cold REST call.
  React.useState(() => {
    if (!ssrData || !ssrUserId) return null;
    queryClient.setQueryData(
      getQueryKey("listing_requests", "findMany", REQUEST_LIST_ARGS_FOR_USER(ssrUserId)),
      ssrData.requests.map(reviveRequest)
    );
    return null;
  });

  // OPTIMIZATION: Single reducer instead of 10+ useState calls
  const [state, dispatch] = React.useReducer(requestsReducer, initialState);

  // Read active tab from URL, default to "my_requests"
  const urlTab = searchParams.get("tab") || "my_requests";

  // OPTIMIZATION: Local state for instant tab switching (optimistic UI)
  // This avoids waiting for URL update before showing the new tab
  const [localActiveTab, setLocalActiveTab] = React.useState(urlTab);

  // Sync local state with URL when URL changes (e.g., browser back/forward)
  React.useEffect(() => {
    setLocalActiveTab(urlTab);
  }, [urlTab]);

  // Use local state for instant UI, URL is updated in background
  const activeTab = localActiveTab;

  // Handle tab change - update URL parameter and close any open modals
  const handleTabChange = React.useCallback(
    (value: string) => {
      // OPTIMIZATION: Update local state FIRST for instant UI response
      setLocalActiveTab(value);

      // IMPORTANT: Close any open modals when switching tabs
      dispatch({ type: "CLOSE_MODAL" });
      dispatch({ type: "CLOSE_DELETE_DIALOG" });
      dispatch({ type: "CLOSE_START_WORK_DIALOG" });

      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      // Remove request param when switching tabs to avoid reopening modal
      params.delete("request");
      // Use replace instead of push for faster navigation (no history entry)
      router.replace(`/account/me/requests?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const {
    searchInput,
    searchQuery,
    selectedRequest,
    deleteDialogOpen,
    requestToDelete,
    startWorkDialogOpen,
    requestToStart,
    shouldOpenChat,
    shouldOpenCompletionForm,
    shouldOpenQRPayment,
  } = state;

  // OPTIMIZED: Debounced search to prevent excessive re-renders
  React.useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "SET_SEARCH_QUERY", payload: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Check for highlight and openChat params from notifications
  const highlightRequestId = searchParams.get("highlight");
  const openChatParam = searchParams.get("openChat");

  // Broad prefix match against every ZenStack findMany cache slot for
  // listing_requests. ZenStack builds keys as
  //   ["zenstack", model, op, args, {infinite, optimisticUpdate}]
  // and TanStack Query v5's { queryKey } filter uses prefix matching,
  // so this patches args-variants (seeded + hook-mounted) in one call.
  const queryKey = React.useMemo(() => ["zenstack", "listing_requests", "findMany"], []);

  // REALTIME: Подписка на изменения статусов заявок
  // When status changes via realtime, update selectedRequest if modal is open
  const handleRealtimeStatusChange = React.useCallback(
    (requestId: string, newStatus: string) => {
      if (selectedRequest?.id === requestId) {
        // Update the selected request with new status
        dispatch({
          type: "SET_SELECTED_REQUEST",
          payload: { ...selectedRequest, status: newStatus as RequestWithRelations["status"] },
        });
      }
    },
    [selectedRequest]
  );

  useRealtimeRequests({
    showToasts: true, // Показывать toast уведомления при изменении статуса
    onStatusChange: handleRealtimeStatusChange,
  });

  // Same args the seed above uses, keyed on ssrUserId so the hash
  // matches deterministically on the very first render even if the
  // client auth singleton hasn't resolved user yet. Falls back to
  // client user?.id on soft-nav cases where the page rendered
  // without SSR data (defensive — shouldn't happen on this route).
  const effectiveUserId = ssrUserId || user?.id || "";
  const listArgs = REQUEST_LIST_ARGS_FOR_USER(effectiveUserId);
  const { data: allRequests, isLoading: requestsLoading } = useFindManylisting_requests(listArgs, {
    enabled: !!effectiveUserId,
    ...CACHE_TIMES.SERVICE_REQUESTS,
  });

  /**
   * Helper: check if accepted request should be shown in "Active Jobs" tab
   *
   * Условия для показа:
   * 1. preferred_date - сегодня или в прошлом
   * 2. ИЛИ менее 5 часов до начала
   *
   * Это позволяет показывать заявки которые должны были начаться
   */
  const isNearStartTime = React.useCallback((req: RequestWithRelations): boolean => {
    if (!req.preferred_date) return false;

    try {
      const now = new Date();
      const prefDate = new Date(req.preferred_date);

      // Set to start of day for date comparison
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const prefDateStart = new Date(
        prefDate.getFullYear(),
        prefDate.getMonth(),
        prefDate.getDate()
      );

      // If preferred date is today or in the past - show in active jobs
      if (prefDateStart <= todayStart) {
        return true;
      }

      // If preferred_time is set, check if less than 5 hours until start
      if (req.preferred_time) {
        const dateStr = prefDate.toISOString().split("T")[0];
        const startTime = new Date(`${dateStr}T${req.preferred_time}:00`);
        const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilStart <= 5;
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  // Преобразуем Decimal координаты и proposed_price в числа (Prisma возвращает строки)
  const normalizedRequests = React.useMemo(() => {
    const all = (allRequests as RequestWithRelations[] | undefined) || [];
    return all.map((req) => ({
      ...req,
      latitude: req.latitude != null ? Number(req.latitude) : null,
      longitude: req.longitude != null ? Number(req.longitude) : null,
      proposed_price: req.proposed_price != null ? Number(req.proposed_price) : null,
      listing: {
        ...req.listing,
        latitude: req.listing.latitude != null ? Number(req.listing.latitude) : null,
        longitude: req.listing.longitude != null ? Number(req.listing.longitude) : null,
      },
    }));
  }, [allRequests]);

  // Разделяем на клиентские и провайдерские на клиенте (O(n) один раз)
  // Активные заявки (in_progress и т.д.) показываются ТОЛЬКО в "Явагдаж буй", не в "Ирсэн"/"Илгээсэн"
  const { myRequests, incomingRequests, activeJobs } = React.useMemo(() => {
    const all = normalizedRequests;
    const my: RequestWithRelations[] = [];
    const incoming: RequestWithRelations[] = [];
    const active: RequestWithRelations[] = [];
    const activeIds = new Set<string>(); // Track added IDs to avoid duplicates

    for (const req of all) {
      // Check if this is an active job (in_progress, awaiting_* statuses, OR accepted + near start time)
      const isActiveStatus = [
        "in_progress",
        "awaiting_client_confirmation",
        "awaiting_completion_details",
        "awaiting_payment",
      ].includes(req.status);
      const isActive = isActiveStatus || (req.status === "accepted" && isNearStartTime(req));

      if (req.client_id === user?.id) {
        // Add to active jobs for client
        if (isActive && !activeIds.has(req.id)) {
          active.push(req);
          activeIds.add(req.id);
        } else if (!isActive) {
          // Only add to "Илгээсэн" if NOT active
          my.push(req);
        }
      }
      if (req.provider_id === user?.id) {
        // Add to active jobs for provider
        if (isActive && !activeIds.has(req.id)) {
          active.push(req);
          activeIds.add(req.id);
        } else if (!isActive) {
          // Only add to "Ирсэн" if NOT active
          incoming.push(req);
        }
      }
    }

    return { myRequests: my, incomingRequests: incoming, activeJobs: active };
  }, [normalizedRequests, user?.id, isNearStartTime]);

  // OPTIMIZATION: Pre-compute lowercase values for efficient filtering
  // This avoids calling toLowerCase() repeatedly during filter iterations
  const searchableCache = React.useMemo(() => {
    const all = normalizedRequests;
    const cache = new Map<
      string,
      { title: string; message: string; clientName: string; providerName: string }
    >();
    for (const req of all) {
      cache.set(req.id, {
        title: req.listing.title.toLowerCase(),
        message: req.message.toLowerCase(),
        clientName: getPersonName(req.client).toLowerCase(),
        providerName: getPersonName(req.provider).toLowerCase(),
      });
    }
    return cache;
  }, [normalizedRequests]);

  // Optimized filter function using cached values
  const filterByQuery = React.useCallback(
    (requests: RequestWithRelations[], query: string, includeProvider = true) => {
      if (!query) return requests;
      const lowerQuery = query.toLowerCase();
      return requests.filter((req) => {
        const cached = searchableCache.get(req.id);
        if (!cached) return false;
        return (
          cached.title.includes(lowerQuery) ||
          cached.message.includes(lowerQuery) ||
          cached.clientName.includes(lowerQuery) ||
          (includeProvider && cached.providerName.includes(lowerQuery))
        );
      });
    },
    [searchableCache]
  );

  // Мемоизированная фильтрация с использованием кэша
  const filteredMyRequests = React.useMemo(
    () => filterByQuery(myRequests, searchQuery),
    [myRequests, searchQuery, filterByQuery]
  );

  const filteredIncomingRequests = React.useMemo(
    () => filterByQuery(incomingRequests, searchQuery),
    [incomingRequests, searchQuery, filterByQuery]
  );

  const filteredActiveJobs = React.useMemo(
    () => filterByQuery(activeJobs, searchQuery, false),
    [activeJobs, searchQuery, filterByQuery]
  );

  // activeRequestsCount removed - no longer needed after removing sidebar

  // Track expired requests that need notification
  const expiredRequestIds = React.useMemo(() => {
    return myRequests
      .filter((req) => {
        if (req.status !== "pending") return false;
        const overdueInfo = checkRequestOverdue(
          req.status,
          req.created_at,
          req.preferred_date,
          req.preferred_time
        );
        return overdueInfo.isOverdue;
      })
      .map((req) => req.id);
  }, [myRequests]);

  // Notifications for expired requests already created server-side
  // ship as part of the SSR payload (ssrData.notifiedExpiredIds),
  // so we no longer need a separate findMany on mount. After the
  // initial render the Set lives in a ref; new ids get added when
  // we create a notification below.
  const notifiedExpiredSetRef = React.useRef<Set<string>>(
    new Set(ssrData?.notifiedExpiredIds ?? [])
  );

  // Mutations. Status changes go through the `transitionRequest`
  // Server Action (see useStatusTransition below) — that's why
  // there's no useUpdatelisting_requests hook here. The remaining
  // ones cover side flows that aren't gated by the state machine:
  //
  //   - deleteRequest: hard-deletes a request row (admin / owner UI)
  //   - createManyNotifications: batch-create the "request expired"
  //     notifications the page fires on mount for any pending
  //     request whose preferred date has already passed
  const deleteRequest = useDeletelisting_requests();
  const createManyNotifications = useCreateManynotifications();

  // Create notifications for expired requests in ONE batch instead
  // of a for-loop firing N separate REST calls (each ~600ms on
  // MN→Seoul). The set of ids already notified came in the SSR
  // payload; we append to it locally as we fire more so an
  // in-session re-render doesn't double up.
  React.useEffect(() => {
    if (!user?.id || expiredRequestIds.length === 0) return;

    const toNotify = expiredRequestIds
      .filter((id) => !notifiedExpiredSetRef.current.has(id))
      .map((id) => {
        const request = myRequests.find((r) => r.id === id);
        if (!request) return null;
        return {
          user_id: user.id,
          type: "request_expired" as const,
          title: "Хүсэлт хугацаа дууссан",
          message: `"${request.listing.title}" хүсэлт хугацаандаа хүлээн авагдаагүй`,
          request_id: id,
          actor_id: null,
        };
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);

    if (toNotify.length === 0) return;

    // Mark as notified *before* sending so a quick re-render (e.g.
    // from a realtime patch) doesn't re-enter this effect and fire
    // another batch before the mutation lands.
    for (const n of toNotify) notifiedExpiredSetRef.current.add(n.request_id);

    createManyNotifications.mutate({
      data: toNotify,
      skipDuplicates: true,
    });
  }, [user?.id, expiredRequestIds, myRequests, createManyNotifications]);

  // Optimistic update helper - используем setQueriesData для partial key match
  const optimisticUpdate = React.useCallback(
    (
      requestId: string,
      newStatus: RequestWithRelations["status"],
      additionalData?: Partial<RequestWithRelations>
    ) => {
      // Update cache optimistically - используем setQueriesData для partial key match
      queryClient.setQueriesData<RequestWithRelations[]>({ queryKey }, (old) => {
        if (!old) return old;
        return old.map((req) =>
          req.id === requestId ? { ...req, status: newStatus, ...additionalData } : req
        );
      });

      // Also update selectedRequest if open
      if (selectedRequest?.id === requestId) {
        dispatch({
          type: "SET_SELECTED_REQUEST",
          payload: selectedRequest
            ? { ...selectedRequest, status: newStatus, ...additionalData }
            : null,
        });
      }
    },
    [queryClient, queryKey, selectedRequest?.id]
  );

  // Revert optimistic update
  const revertOptimisticUpdate = React.useCallback(
    (requestId: string, oldStatus: RequestWithRelations["status"]) => {
      queryClient.setQueriesData<RequestWithRelations[]>({ queryKey }, (old) => {
        if (!old) return old;
        return old.map((req) => (req.id === requestId ? { ...req, status: oldStatus } : req));
      });
      if (selectedRequest?.id === requestId) {
        dispatch({
          type: "SET_SELECTED_REQUEST",
          payload: selectedRequest ? { ...selectedRequest, status: oldStatus } : null,
        });
      }
    },
    [queryClient, queryKey, selectedRequest?.id]
  );

  // Status-transition runner. Each handler below is now a small
  // declarative config — the Server Action (`transitionRequest`)
  // owns the state machine, role check, and side effects (status
  // update + notification + optional review) inside one
  // prisma.$transaction. The hook just wraps optimistic UI + revert.
  // `isTransitionPending` is true while any in-flight transition
  // hasn't settled — UI uses it to disable buttons / show spinners.
  const { runTransition, isPending: isTransitionPending } = useStatusTransition({
    allRequests: allRequests as RequestWithRelations[] | undefined,
    optimisticUpdate,
    revertOptimisticUpdate,
  });

  // ────────────────── Provider-side actions ──────────────────
  const handleAccept = React.useCallback(
    (requestId: string) =>
      runTransition({
        requestId,
        action: "accept",
        toStatus: "accepted",
        optimisticData: { accepted_at: new Date() },
        successToast: "Хүсэлт зөвшөөрөгдлөө!",
        onSuccess: () => dispatch({ type: "CLOSE_MODAL" }),
      }),
    [runTransition]
  );

  const handleReject = React.useCallback(
    (requestId: string) =>
      runTransition({
        requestId,
        action: "reject",
        toStatus: "rejected",
        successToast: "Хүсэлт татгалзагдлаа",
        onSuccess: () => dispatch({ type: "CLOSE_MODAL" }),
      }),
    [runTransition]
  );

  const handleStartWork = React.useCallback(
    (requestId: string) =>
      runTransition({
        requestId,
        action: "start_work",
        toStatus: "in_progress",
        optimisticData: { started_at: new Date() },
        successToast: "Ажил эхэллээ!",
        onSuccess: () => dispatch({ type: "CLOSE_MODAL" }),
      }),
    [runTransition]
  );

  const handleProposePrice = React.useCallback(
    (requestId: string, price: number) =>
      runTransition({
        requestId,
        action: "propose_price",
        toStatus: "price_proposed",
        optimisticData: { proposed_price: price },
        proposedPrice: price,
        successToast: "Үнийн санал илгээгдлээ!",
      }),
    [runTransition]
  );

  const handleCancelByProvider = React.useCallback(
    (requestId: string) =>
      runTransition({
        requestId,
        action: "cancel_by_provider",
        toStatus: "cancelled_by_provider",
        successToast: "Хүсэлт цуцлагдлаа",
        onSuccess: () => dispatch({ type: "CLOSE_MODAL" }),
      }),
    [runTransition]
  );

  const handleProviderSubmitDetails = React.useCallback(
    (requestId: string, description: string, photoUrls: string[]) =>
      runTransition({
        requestId,
        action: "provider_submit_details",
        toStatus: "awaiting_client_confirmation",
        optimisticData: {
          completion_description: description,
          completion_photos: photoUrls,
        },
        completionDescription: description,
        completionPhotos: photoUrls,
        successToast: "Ажлын тайлан илгээгдлээ!",
      }),
    [runTransition]
  );

  // ────────────────── Client-side actions ──────────────────
  const handleConfirmPrice = React.useCallback(
    (requestId: string) =>
      runTransition({
        requestId,
        action: "confirm_price",
        toStatus: "accepted",
        optimisticData: { accepted_at: new Date() },
        successToast: "Үнэ зөвшөөрөгдлөө!",
      }),
    [runTransition]
  );

  const handleRejectPrice = React.useCallback(
    (requestId: string) =>
      runTransition({
        requestId,
        action: "reject_price",
        toStatus: "rejected",
        optimisticData: { proposed_price: null },
        successToast: "Үнэ татгалзагдлаа",
      }),
    [runTransition]
  );

  const handleCancelByClient = React.useCallback(
    (requestId: string) =>
      runTransition({
        requestId,
        action: "cancel_by_client",
        toStatus: "cancelled_by_client",
        successToast: "Хүсэлт цуцлагдлаа",
        onSuccess: () => dispatch({ type: "CLOSE_MODAL" }),
      }),
    [runTransition]
  );

  // Legacy stub kept because RequestActions interface still names it
  // — modern UI calls handleProviderSubmitDetails to advance from
  // in_progress.
  const handleComplete = React.useCallback(async (_requestId: string) => {
    /* no-op, see handleProviderSubmitDetails */
  }, []);

  const handleClientConfirmCompletion = React.useCallback(
    (requestId: string, rating: number, comment: string) =>
      runTransition({
        requestId,
        action: "client_confirm_completion",
        toStatus: "awaiting_payment",
        rating,
        comment,
        successToast: "Амжилттай баталгаажууллаа!",
      }),
    [runTransition]
  );

  const handlePaymentComplete = React.useCallback(
    (requestId: string) =>
      runTransition({
        requestId,
        action: "payment_complete",
        toStatus: "completed",
        optimisticData: { completed_at: new Date() },
        successToast: "Ажил дууслаа!",
      }),
    [runTransition]
  );

  const handleDelete = React.useCallback(async () => {
    if (!requestToDelete) return;

    try {
      await deleteRequest.mutateAsync({
        where: { id: requestToDelete },
      });
      // Remove from cache - используем setQueriesData для partial key match
      queryClient.setQueriesData<RequestWithRelations[]>({ queryKey }, (old) => {
        if (!old) return old;
        return old.filter((req) => req.id !== requestToDelete);
      });
      toast.success("Хүсэлт устгагдлаа");
      dispatch({ type: "CLOSE_DELETE_DIALOG" });
      dispatch({ type: "CLOSE_MODAL" });
    } catch {
      toast.error("Алдаа гарлаа");
    }
  }, [requestToDelete, deleteRequest, queryClient, queryKey]);

  const handleSelectRequest = React.useCallback((request: RequestWithRelations) => {
    dispatch({ type: "SET_SELECTED_REQUEST", payload: request });
  }, []);

  // Open chat directly from list item
  const handleOpenChat = React.useCallback((request: RequestWithRelations) => {
    dispatch({ type: "OPEN_CHAT_FOR_REQUEST", payload: request });
  }, []);

  // Track if modal was manually closed to prevent useEffect from reopening.
  // Set synchronously inside handleCloseModal; the URL→modal sync effect
  // checks-and-clears it, so a stale ?request=ID still in the URL right
  // after close (Next.js router.replace is async) does not bounce the
  // modal back open.
  const wasManuallyClosedRef = React.useRef(false);

  const handleCloseModal = React.useCallback(() => {
    wasManuallyClosedRef.current = true;
    // Drop both `request` (canonical) and any leftover `highlight` /
    // `openChat` from the original notification deeplink — otherwise
    // the highlight effect (or a re-render with stale searchParams)
    // can re-trigger and reopen the modal.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("request");
    params.delete("highlight");
    params.delete("openChat");
    const qs = params.toString();
    router.replace(qs ? `/account/me/requests?${qs}` : "/account/me/requests", {
      scroll: false,
    });
    dispatch({ type: "CLOSE_MODAL" });
  }, [searchParams, router]);

  // REALTIME SYNC: Update selectedRequest when allRequests changes (e.g., via realtime refetch)
  // This ensures the modal always shows the latest data
  React.useEffect(() => {
    if (!selectedRequest || !allRequests) return;

    const updatedRequest = (allRequests as RequestWithRelations[])?.find(
      (r) => r.id === selectedRequest.id
    );

    if (updatedRequest && updatedRequest.status !== selectedRequest.status) {
      dispatch({ type: "SET_SELECTED_REQUEST", payload: updatedRequest });
    }
  }, [allRequests, selectedRequest]);

  // Actions object for modal
  const actions: RequestActions = React.useMemo(
    () => ({
      onAccept: handleAccept,
      onReject: handleReject,
      onCancelByClient: handleCancelByClient,
      onCancelByProvider: handleCancelByProvider,
      onStartWork: handleStartWork,
      onComplete: handleComplete,
      // Completion flow actions
      onProviderSubmitDetails: handleProviderSubmitDetails,
      onClientConfirmCompletion: handleClientConfirmCompletion,
      onPaymentComplete: handlePaymentComplete,
      isUpdating: isTransitionPending,
      isDeleting: deleteRequest.isPending,
    }),
    [
      handleAccept,
      handleReject,
      handleCancelByClient,
      handleCancelByProvider,
      handleStartWork,
      handleComplete,
      handleProviderSubmitDetails,
      handleClientConfirmCompletion,
      handlePaymentComplete,
      isTransitionPending,
      deleteRequest.isPending,
    ]
  );

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle highlight and openChat URL parameters from notifications.
  // One-shot per highlight value: a ref records which `?highlight=`
  // we've already acted on so the effect doesn't reopen the modal
  // every time `selectedRequest` flips back to null. The previous
  // version listed `selectedRequest` in deps without guarding, so
  // closing the modal (selectedRequest -> null) re-fired the effect
  // while React still saw the original `highlightRequestId` from
  // the in-flight router.replace, and the modal popped right back
  // open the moment the user hit the X.
  const handledHighlightRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!highlightRequestId || !allRequests || requestsLoading) return;
    if (handledHighlightRef.current === highlightRequestId) return;

    const requestToHighlight = (allRequests as RequestWithRelations[])?.find(
      (r) => r.id === highlightRequestId
    );

    if (requestToHighlight) {
      handledHighlightRef.current = highlightRequestId;
      // If openChat param is present, open chat directly
      if (openChatParam === "true") {
        dispatch({ type: "OPEN_CHAT_FOR_REQUEST", payload: requestToHighlight });
      } else {
        dispatch({ type: "SET_SELECTED_REQUEST", payload: requestToHighlight });
      }
      // Convert the deeplink to the canonical `?request=ID` shape.
      // Doing it in one router.replace (rather than wiping all params
      // and letting the URL→modal sync effect re-add them) avoids a
      // race where two queued navigations overwrite each other and
      // either the highlight or the request param ends up missing.
      const params = new URLSearchParams();
      params.set("request", highlightRequestId);
      // Preserve the active tab when notifications deep-link in.
      const tab = searchParams.get("tab");
      if (tab) params.set("tab", tab);
      router.replace(`/account/me/requests?${params.toString()}`, { scroll: false });
    }
  }, [highlightRequestId, openChatParam, allRequests, requestsLoading, router, searchParams]);

  // Handle request URL parameter - restore open modal on page refresh.
  // The guard ref is cleared only once the URL has actually lost its
  // `request` param — keeping it set across the in-between renders so
  // the URL→modal sync effect doesn't re-add `?request=ID` from stale
  // selectedRequest while the close is settling.
  React.useEffect(() => {
    const requestIdFromUrl = searchParams.get("request");

    if (wasManuallyClosedRef.current) {
      if (!requestIdFromUrl) {
        wasManuallyClosedRef.current = false;
      }
      return;
    }

    if (!requestIdFromUrl || !allRequests || requestsLoading || selectedRequest) return;

    const requestToOpen = (allRequests as RequestWithRelations[])?.find(
      (r) => r.id === requestIdFromUrl
    );

    if (requestToOpen) {
      dispatch({ type: "SET_SELECTED_REQUEST", payload: requestToOpen });
    }
  }, [searchParams, allRequests, requestsLoading, selectedRequest]);

  // Sync URL when selectedRequest changes (for cases where modal is opened via dispatch)
  React.useEffect(() => {
    // Skip while a manual close is in flight. Otherwise React can run
    // this effect on a render where selectedRequest is still the old
    // object but searchParams has just dropped `request` — we'd then
    // re-add the param and the close-effect bounces the modal back open.
    if (wasManuallyClosedRef.current) return;

    const requestIdFromUrl = searchParams.get("request");

    if (selectedRequest && requestIdFromUrl !== selectedRequest.id) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("request", selectedRequest.id);
      router.replace(`/account/me/requests?${params.toString()}`, { scroll: false });
    }
  }, [selectedRequest, searchParams, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const totalCount = myRequests.length + incomingRequests.length + activeJobs.length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader backHref="/" />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Editorial page title */}
        <div className="flex items-end justify-between gap-3 mb-6 md:mb-8">
          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
              Хүсэлтүүд
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 tabular">
              {totalCount} хүсэлт байна
            </p>
          </div>
        </div>

        {/* Search — pill input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Гарчиг, мессеж, хэрэглэгчээр хайх..."
            value={searchInput}
            onChange={(e) => dispatch({ type: "SET_SEARCH_INPUT", payload: e.target.value })}
            className="pl-11 h-11 rounded-full bg-muted border-0 focus-visible:ring-2 focus-visible:ring-foreground/20"
          />
        </div>

        {/* Tabs — editorial pill row */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mb-6">
          <TabsList className="w-full grid grid-cols-3 p-1 h-10 md:h-11 bg-muted rounded-full">
            <TabsTrigger
              value="my_requests"
              className="rounded-full px-2 sm:px-3 md:px-4 data-[state=active]:bg-foreground data-[state=active]:text-background text-[11px] sm:text-xs md:text-sm font-medium gap-1 sm:gap-1.5"
            >
              <Send className="hidden sm:block h-3.5 w-3.5 md:h-4 md:w-4" />
              Илгээсэн
              <span className="px-1 sm:px-1.5 py-0.5 rounded-full bg-background/15 text-[9px] sm:text-[10px] md:text-xs font-semibold tabular">
                {myRequests.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="incoming"
              className="rounded-full px-2 sm:px-3 md:px-4 data-[state=active]:bg-foreground data-[state=active]:text-background text-[11px] sm:text-xs md:text-sm font-medium gap-1 sm:gap-1.5"
            >
              <Inbox className="hidden sm:block h-3.5 w-3.5 md:h-4 md:w-4" />
              Ирсэн
              <span className="px-1 sm:px-1.5 py-0.5 rounded-full bg-background/15 text-[9px] sm:text-[10px] md:text-xs font-semibold tabular">
                {incomingRequests.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="active_jobs"
              className="rounded-full px-2 sm:px-3 md:px-4 data-[state=active]:bg-foreground data-[state=active]:text-background text-[11px] sm:text-xs md:text-sm font-medium gap-1 sm:gap-1.5"
            >
              <Play className="hidden sm:block h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Явагдаж буй</span>
              <span className="sm:hidden">Идэвх</span>
              <span className="px-1 sm:px-1.5 py-0.5 rounded-full bg-background/15 text-[9px] sm:text-[10px] md:text-xs font-semibold tabular">
                {activeJobs.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* My Requests - миний илгээсэн хүсэлтүүд */}
          <TabsContent value="my_requests" className="mt-0">
            {requestsLoading ? (
              <LoadingState />
            ) : filteredMyRequests.length === 0 ? (
              <EmptyState
                icon={<Send className="h-6 w-6" />}
                title="Илгээсэн хүсэлт байхгүй"
                description="Та үйлчилгээнд хүсэлт илгээхэд энд харагдана"
              />
            ) : (
              <div className="space-y-3">
                {filteredMyRequests.map((request) => (
                  <RequestListItem
                    key={request.id}
                    request={request}
                    type="sent"
                    onSelect={handleSelectRequest}
                    onOpenChat={handleOpenChat}
                    onCancelByClient={handleCancelByClient}
                    onConfirmPrice={handleConfirmPrice}
                    onRejectPrice={handleRejectPrice}
                    isUpdating={isTransitionPending}
                    onPrefetch={warmDetailModal}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Incoming Requests - надад ирсэн хүсэлтүүд */}
          <TabsContent value="incoming" className="mt-0">
            {requestsLoading ? (
              <LoadingState />
            ) : filteredIncomingRequests.length === 0 ? (
              <EmptyState
                icon={<Inbox className="h-6 w-6" />}
                title="Ирсэн хүсэлт байхгүй"
                description="Таны үйлчилгээнд сонирхсон хүмүүс энд харагдана"
              />
            ) : (
              <div className="space-y-3">
                {filteredIncomingRequests.map((request) => (
                  <RequestListItem
                    key={request.id}
                    request={request}
                    type="received"
                    onSelect={handleSelectRequest}
                    onOpenChat={handleOpenChat}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onCancelByProvider={handleCancelByProvider}
                    onProposePrice={handleProposePrice}
                    isUpdating={isTransitionPending}
                    onPrefetch={warmDetailModal}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Active Jobs - ажилд байгаа захиалгууд */}
          <TabsContent value="active_jobs" className="mt-0">
            {requestsLoading ? (
              <LoadingState />
            ) : filteredActiveJobs.length === 0 ? (
              <EmptyState
                icon={<Play className="h-6 w-6" />}
                title="Идэвхтэй ажил байхгүй"
                description="Хүлээн авсан болон эхэлсэн ажлууд энд харагдана"
              />
            ) : (
              <div className="space-y-4">
                {filteredActiveJobs.map((request) => {
                  // Format preferred date
                  const preferredDateStr = request.preferred_date
                    ? new Date(request.preferred_date).toLocaleDateString("mn-MN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })
                    : null;

                  // Check if this is a virtual "near start" status
                  const isVirtualActive = request.status === "accepted" && isNearStartTime(request);

                  return (
                    <button
                      type="button"
                      key={request.id}
                      onClick={() => handleSelectRequest(request)}
                      onMouseEnter={warmDetailModal}
                      onTouchStart={warmDetailModal}
                      onFocus={warmDetailModal}
                      style={{ transitionTimingFunction: "var(--ease-brand)" }}
                      className="relative w-full text-left bg-card rounded-2xl ring-1 ring-border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]"
                    >
                      {/* Status indicator bar */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-1 ${
                          request.status === "in_progress"
                            ? "bg-blue-500"
                            : isVirtualActive
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                      />

                      <div className="p-4 pt-5">
                        {/* Top row: status badge + service info */}
                        <div className="flex items-start gap-3">
                          {/* Service image */}
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-muted ring-1 ring-border">
                            <Image
                              src={getListingImage(request.listing)}
                              alt={request.listing.title}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-display font-semibold text-sm leading-snug line-clamp-1">
                                {request.listing.title}
                              </h3>
                              {/* Price display */}
                              {request.proposed_price ? (
                                <span className="font-display text-sm font-bold tabular text-violet-600 dark:text-violet-400">
                                  {Number(request.proposed_price).toLocaleString()}₮
                                </span>
                              ) : request.listing.is_negotiable ? (
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                  Тохиролцоно
                                </span>
                              ) : request.listing.price ? (
                                <span className="font-display text-sm font-bold tabular text-foreground">
                                  {Number(request.listing.price).toLocaleString()}₮
                                </span>
                              ) : null}
                              <div
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ${
                                  request.status === "in_progress"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20"
                                    : isVirtualActive
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20"
                                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    request.status === "in_progress"
                                      ? "bg-blue-500 animate-pulse"
                                      : isVirtualActive
                                        ? "bg-amber-500 animate-pulse"
                                        : "bg-emerald-500"
                                  }`}
                                />
                                {request.status === "in_progress"
                                  ? "Ажиллаж байна"
                                  : isVirtualActive
                                    ? "Ажил эхлэх ёстой"
                                    : "Хүлээгдэж байна"}
                              </div>
                              {/* Счётчик времени для in_progress */}
                              {request.status === "in_progress" && request.started_at && (
                                <ElapsedTimeCounter startedAt={request.started_at} size="sm" />
                              )}
                            </div>

                            {/* Person info */}
                            {(() => {
                              const isMyRequest = request.client_id === user?.id;
                              const person = isMyRequest ? request.provider : request.client;
                              const label = isMyRequest ? "Үйлчилгээ үзүүлэгч" : "Захиалагч";
                              return (
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                  <div className="relative w-5 h-5 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-border">
                                    {person.avatar_url ? (
                                      <Image
                                        src={person.avatar_url}
                                        alt=""
                                        fill
                                        unoptimized={person.avatar_url.includes("dicebear")}
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <span>{label}:</span>
                                  <span className="font-medium text-foreground truncate">
                                    {getPersonName(person)}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Message - compact */}
                        {request.message && (
                          <div className="mt-3 px-3 py-2 bg-muted/60 rounded-xl">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <MessageSquare className="h-3 w-3 shrink-0" />
                              <span className="truncate">{request.message}</span>
                            </p>
                          </div>
                        )}

                        {/* Details row - inline */}
                        <div className="flex items-center gap-3 mt-3 text-xs tabular text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-orange-500" />
                            <span>{preferredDateStr || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-violet-500" />
                            <span>{request.preferred_time || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            <span className="truncate">
                              {request.listing.service_type === "remote"
                                ? // remote = клиент приходит к исполнителю, показываем адрес исполнителя
                                  request.listing.address || "—"
                                : // on_site = исполнитель едет к клиенту, показываем адрес клиента из заявки
                                  request.address_detail ||
                                  (request.aimag
                                    ? [
                                        request.aimag.name,
                                        request.district?.name,
                                        request.khoroo?.name,
                                      ]
                                        .filter(Boolean)
                                        .join(", ")
                                    : "—")}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex gap-2">
                          {/* Client actions */}
                          {request.client_id === user?.id && (
                            <>
                              {/* Cancel button - client can cancel only accepted (NOT in_progress!) */}
                              {request.status === "accepted" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelByClient(request.id);
                                  }}
                                  disabled={isTransitionPending}
                                  className="flex-1 h-9 px-4 rounded-full text-xs font-semibold border border-border bg-card hover:bg-muted text-destructive transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Цуцлах
                                </button>
                              )}
                              {/* Confirm completion */}
                              {request.status === "awaiting_client_confirmation" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectRequest(request);
                                  }}
                                  className="flex-1 h-9 px-4 rounded-full text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Баталгаажуулах
                                </button>
                              )}
                            </>
                          )}

                          {/* Provider actions */}
                          {request.provider_id === user?.id && (
                            <>
                              {/* Cancel button for provider - accepted or in_progress */}
                              {(request.status === "accepted" ||
                                request.status === "in_progress") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelByProvider(request.id);
                                  }}
                                  disabled={isTransitionPending}
                                  className="flex-1 h-9 px-4 rounded-full text-xs font-semibold border border-border bg-card hover:bg-muted text-destructive transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Цуцлах
                                </button>
                              )}
                              {request.status === "accepted" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch({
                                      type: "OPEN_START_WORK_DIALOG",
                                      payload: request.id,
                                    });
                                  }}
                                  disabled={isTransitionPending}
                                  className="flex-1 h-9 px-4 rounded-full text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                                >
                                  {isTransitionPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5" />
                                  )}
                                  Эхлүүлэх
                                </button>
                              )}
                              {request.status === "in_progress" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Open detail modal with completion form auto-opened
                                    dispatch({
                                      type: "OPEN_COMPLETION_FOR_REQUEST",
                                      payload: request,
                                    });
                                  }}
                                  disabled={isTransitionPending}
                                  className="flex-1 h-9 px-4 rounded-full text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                                >
                                  {isTransitionPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  )}
                                  Дуусгах
                                </button>
                              )}
                              {request.status === "awaiting_client_confirmation" && (
                                <button
                                  type="button"
                                  disabled
                                  className="flex-1 h-9 px-4 rounded-full text-xs font-semibold bg-muted text-muted-foreground transition-colors flex items-center justify-center gap-1.5 opacity-70 cursor-not-allowed"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  Хүлээж байна...
                                </button>
                              )}
                              {request.status === "awaiting_payment" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Open detail modal with QR payment auto-opened
                                    dispatch({ type: "OPEN_QR_FOR_REQUEST", payload: request });
                                  }}
                                  disabled={isTransitionPending}
                                  className="flex-1 h-9 px-4 rounded-full text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                  Төлбөр авах
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ActiveRequestsSidebar removed - replaced by "Ажилд" tab */}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          userId={user.id}
          actions={actions}
          onClose={handleCloseModal}
          autoOpenChat={shouldOpenChat}
          onChatOpened={() => dispatch({ type: "SET_SHOULD_OPEN_CHAT", payload: false })}
          autoOpenCompletionForm={shouldOpenCompletionForm}
          onCompletionFormOpened={() =>
            dispatch({ type: "SET_SHOULD_OPEN_COMPLETION_FORM", payload: false })
          }
          autoOpenQRPayment={shouldOpenQRPayment}
          onQRPaymentOpened={() => dispatch({ type: "SET_SHOULD_OPEN_QR_PAYMENT", payload: false })}
          onProposePrice={handleProposePrice}
          onConfirmPrice={handleConfirmPrice}
          onRejectPrice={handleRejectPrice}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !open && dispatch({ type: "CLOSE_DELETE_DIALOG" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Хүсэлт устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Хүсэлт бүрмөсөн устгагдах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRequest.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Work Confirmation Dialog */}
      <AlertDialog
        open={startWorkDialogOpen}
        onOpenChange={(open) => !open && dispatch({ type: "CLOSE_START_WORK_DIALOG" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ажил эхлүүлэх үү?</AlertDialogTitle>
            <AlertDialogDescription>
              Та энэ ажлыг эхлүүлэхдээ итгэлтэй байна уу? Ажил эхэлсний дараа захиалагч үүнийг харах
              болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (requestToStart) {
                  handleStartWork(requestToStart);
                }
                dispatch({ type: "CLOSE_START_WORK_DIALOG" });
              }}
              className="rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              {isTransitionPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Эхлүүлэх
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RequestsClientProps {
  /**
   * SSR-seeded payload: every request the user is party to plus the
   * set of expired-request notifications that already exist. When
   * provided, the list hook and the expired-notify pass skip their
   * client round-trips and paint on first render.
   */
  ssrData?: RequestsPageData;
  /**
   * Current user id as known on the server. Passed so the seed hashes
   * the hook's args immediately, without waiting for the client
   * Supabase auth singleton to finish initializing.
   */
  ssrUserId?: string;
}

// No Suspense wrapper: the page is dynamic (revalidate=0) and SSR
// already resolves the data + session before the client mounts. The
// fallback never had a chance to render and just added one frame of
// component tree noise on every navigation.
export function RequestsClient({ ssrData, ssrUserId }: RequestsClientProps = {}) {
  return <RequestsPageContent ssrData={ssrData} ssrUserId={ssrUserId} />;
}
