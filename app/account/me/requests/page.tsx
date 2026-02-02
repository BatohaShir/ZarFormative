"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Search,
  Send,
  Inbox,
  Play,
  Loader2,
  Undo2,
  Clock,
  CheckCircle,
  User,
  MapPin,
  Calendar,
  MessageSquare,
  MessageCircle,
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
  useUpdatelisting_requests,
  useDeletelisting_requests,
  useCreatenotifications,
  useFindManynotifications,
  useCreatereviews,
} from "@/lib/hooks";
import { CACHE_TIMES } from "@/lib/react-query-config";
import { useRealtimeRequests } from "@/hooks/use-realtime-requests";
import {
  RequestListItem,
  type RequestWithRelations,
  type RequestActions,
  getPersonName,
  getListingImage,
  formatCreatedAt,
  checkRequestOverdue,
} from "./_components";

// Lazy load heavy components
const RequestDetailModal = dynamic(
  () => import("./_components/request-detail-modal").then((mod) => ({ default: mod.RequestDetailModal })),
  { ssr: false }
);

const ElapsedTimeCounter = dynamic(
  () => import("@/components/elapsed-time-counter").then((mod) => ({ default: mod.ElapsedTimeCounter })),
  { ssr: false }
);

// ActiveRequestsSidebar removed - replaced by "Ажилд" tab

// MobileActiveRequestsButton removed - replaced by "Ажилд" tab

// Empty state component
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
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <div className="text-muted-foreground/50">{icon}</div>
      </div>
      <p className="text-base font-medium text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground text-center max-w-xs">{description}</p>
    </div>
  );
});

// Loading skeleton
function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card border rounded-xl p-3 flex gap-3">
          <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-lg shrink-0" />
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

function RequestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // OPTIMIZATION: Single reducer instead of 10+ useState calls
  const [state, dispatch] = React.useReducer(requestsReducer, initialState);

  // Read active tab from URL, default to "my_requests"
  const activeTab = searchParams.get("tab") || "my_requests";

  // Handle tab change - update URL parameter
  const handleTabChange = React.useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`/account/me/requests?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

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

  // Query key для invalidation - используем findMany prefix как ZenStack
  const queryKey = React.useMemo(
    () => ["listing_requests", "findMany"],
    []
  );

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

  // ОПТИМИЗАЦИЯ: Один запрос вместо двух с OR условием
  const {
    data: allRequests,
    isLoading: requestsLoading,
  } = useFindManylisting_requests(
    {
      where: {
        OR: [
          { client_id: user?.id || "" },
          { provider_id: user?.id || "" },
        ],
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
            // OPTIMIZATION: latitude/longitude removed from list view - only needed in detail modal
            images: {
              select: { url: true, is_cover: true },
              take: 1,
              orderBy: { is_cover: "desc" },
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
        // OPTIMIZATION: Only fetch names for location display in list view
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
      orderBy: { created_at: "desc" },
    },
    {
      enabled: !!user?.id,
      ...CACHE_TIMES.SERVICE_REQUESTS,
    }
  );

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
      const prefDateStart = new Date(prefDate.getFullYear(), prefDate.getMonth(), prefDate.getDate());

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
    return all.map(req => ({
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
    const cache = new Map<string, { title: string; message: string; clientName: string; providerName: string }>();
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

  // Check if notifications already exist for expired requests
  const { data: existingNotifications } = useFindManynotifications(
    {
      where: {
        user_id: user?.id || "",
        type: "request_expired",
        request_id: { in: expiredRequestIds },
      },
      select: { request_id: true },
    },
    {
      enabled: !!user?.id && expiredRequestIds.length > 0,
    }
  );

  // Mutations
  const updateRequest = useUpdatelisting_requests();
  const deleteRequest = useDeletelisting_requests();
  const createNotification = useCreatenotifications();
  const createReview = useCreatereviews();

  // Create notifications for expired requests that don't have one yet
  const notifiedRequestsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!user?.id || expiredRequestIds.length === 0) return;

    const existingRequestIds = new Set(
      (existingNotifications as { request_id: string | null }[] | undefined)
        ?.map((n) => n.request_id)
        .filter((id): id is string => id !== null) || []
    );

    for (const requestId of expiredRequestIds) {
      // Skip if already notified in this session or in DB
      if (notifiedRequestsRef.current.has(requestId) || existingRequestIds.has(requestId)) {
        continue;
      }

      const request = myRequests.find((r) => r.id === requestId);
      if (!request) continue;

      // Mark as notified before sending to prevent duplicates
      notifiedRequestsRef.current.add(requestId);

      // Create notification for client
      createNotification.mutate({
        data: {
          user_id: user.id,
          type: "request_expired",
          title: "Хүсэлт хугацаа дууссан",
          message: `"${request.listing.title}" хүсэлт хугацаандаа хүлээн авагдаагүй`,
          request_id: requestId,
          actor_id: null,
        },
      });
    }
  }, [user?.id, expiredRequestIds, existingNotifications, myRequests, createNotification]);

  // Optimistic update helper - используем setQueriesData для partial key match
  const optimisticUpdate = React.useCallback(
    (requestId: string, newStatus: RequestWithRelations["status"], additionalData?: Partial<RequestWithRelations>) => {
      // Update cache optimistically - используем setQueriesData для partial key match
      queryClient.setQueriesData<RequestWithRelations[]>(
        { queryKey },
        (old) => {
          if (!old) return old;
          return old.map((req) =>
            req.id === requestId
              ? { ...req, status: newStatus, ...additionalData }
              : req
          );
        }
      );

      // Also update selectedRequest if open
      if (selectedRequest?.id === requestId) {
        dispatch({
          type: "SET_SELECTED_REQUEST",
          payload: selectedRequest ? { ...selectedRequest, status: newStatus, ...additionalData } : null,
        });
      }
    },
    [queryClient, queryKey, selectedRequest?.id]
  );

  // Revert optimistic update
  const revertOptimisticUpdate = React.useCallback(
    (requestId: string, oldStatus: RequestWithRelations["status"]) => {
      queryClient.setQueriesData<RequestWithRelations[]>(
        { queryKey },
        (old) => {
          if (!old) return old;
          return old.map((req) =>
            req.id === requestId ? { ...req, status: oldStatus } : req
          );
        }
      );
      if (selectedRequest?.id === requestId) {
        dispatch({
          type: "SET_SELECTED_REQUEST",
          payload: selectedRequest ? { ...selectedRequest, status: oldStatus } : null,
        });
      }
    },
    [queryClient, queryKey, selectedRequest?.id]
  );

  // Action handlers with optimistic updates
  const handleAccept = React.useCallback(
    async (requestId: string) => {
      const request = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "accepted", { accepted_at: new Date() });

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "accepted", accepted_at: new Date() },
        });

        // Create notification for client
        if (request && user?.id) {
          createNotification.mutate({
            data: {
              user_id: request.client_id,
              type: "request_accepted",
              title: "Хүсэлт зөвшөөрөгдлөө",
              message: `"${request.listing.title}" хүсэлт зөвшөөрөгдлөө`,
              request_id: requestId,
              actor_id: user.id,
            },
          });
        }

        // OPTIMIZED: Invalidate cache to ensure consistency
        await queryClient.invalidateQueries({ queryKey });

        toast.success("Хүсэлт зөвшөөрөгдлөө!");
        dispatch({ type: "CLOSE_MODAL" });
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
  );

  // Price proposal handler (provider proposes price for negotiable listings)
  const handleProposePrice = React.useCallback(
    async (requestId: string, price: number) => {
      const request = normalizedRequests.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "price_proposed", { proposed_price: price });

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "price_proposed", proposed_price: price },
        });

        // Create notification for client
        if (request && user?.id) {
          createNotification.mutate({
            data: {
              user_id: request.client_id,
              type: "new_message",
              title: "Үнийн санал ирлээ",
              message: `"${request.listing.title}" үйлчилгээнд ${price.toLocaleString()}₮ үнэ санал болголоо`,
              request_id: requestId,
              actor_id: user.id,
            },
          });
        }

        await queryClient.invalidateQueries({ queryKey });
        toast.success("Үнийн санал илгээгдлээ!");
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [normalizedRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
  );

  // Client confirms the proposed price
  const handleConfirmPrice = React.useCallback(
    async (requestId: string) => {
      const request = normalizedRequests.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "accepted", { accepted_at: new Date() });

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "accepted", accepted_at: new Date() },
        });

        // Create notification for provider
        if (request && user?.id) {
          createNotification.mutate({
            data: {
              user_id: request.provider_id,
              type: "request_accepted",
              title: "Үнэ зөвшөөрөгдлөө",
              message: `"${request.listing.title}" үнийн санал зөвшөөрөгдлөө`,
              request_id: requestId,
              actor_id: user.id,
            },
          });
        }

        await queryClient.invalidateQueries({ queryKey });
        toast.success("Үнэ зөвшөөрөгдлөө!");
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [normalizedRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
  );

  // Client rejects the proposed price
  const handleRejectPrice = React.useCallback(
    async (requestId: string) => {
      const request = normalizedRequests.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "rejected");

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "rejected", proposed_price: null },
        });

        // Create notification for provider
        if (request && user?.id) {
          createNotification.mutate({
            data: {
              user_id: request.provider_id,
              type: "request_rejected",
              title: "Үнэ татгалзагдлаа",
              message: `"${request.listing.title}" үнийн санал татгалзагдлаа`,
              request_id: requestId,
              actor_id: user.id,
            },
          });
        }

        await queryClient.invalidateQueries({ queryKey });
        toast.success("Үнэ татгалзагдлаа");
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [normalizedRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
  );

  const handleReject = React.useCallback(
    async (requestId: string) => {
      const request = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "rejected");

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "rejected" },
        });

        // Create notification for client
        if (request && user?.id) {
          createNotification.mutate({
            data: {
              user_id: request.client_id,
              type: "request_rejected",
              title: "Хүсэлт татгалзагдлаа",
              message: `"${request.listing.title}" хүсэлт татгалзагдлаа`,
              request_id: requestId,
              actor_id: user.id,
            },
          });
        }

        // OPTIMIZED: Invalidate cache to ensure consistency
        await queryClient.invalidateQueries({ queryKey });

        toast.success("Хүсэлт татгалзагдлаа");
        dispatch({ type: "CLOSE_MODAL" });
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
  );

  const handleCancelByClient = React.useCallback(
    async (requestId: string) => {
      const request = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "cancelled_by_client");

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "cancelled_by_client" },
        });

        // Create notification for provider
        if (request && user?.id) {
          createNotification.mutate({
            data: {
              user_id: request.provider_id,
              type: "request_cancelled",
              title: "Хүсэлт цуцлагдлаа",
              message: `"${request.listing.title}" хүсэлт захиалагчаас цуцлагдлаа`,
              request_id: requestId,
              actor_id: user.id,
            },
          });
        }

        // OPTIMIZED: Invalidate cache to ensure consistency
        await queryClient.invalidateQueries({ queryKey });

        toast.success("Хүсэлт цуцлагдлаа");
        dispatch({ type: "CLOSE_MODAL" });
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
  );

  const handleCancelByProvider = React.useCallback(
    async (requestId: string) => {
      const request = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "cancelled_by_provider");

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "cancelled_by_provider" },
        });

        // Create notification for client
        if (request && user?.id) {
          createNotification.mutate({
            data: {
              user_id: request.client_id,
              type: "cancelled_by_provider",
              title: "Захиалга цуцлагдлаа",
              message: `"${request.listing.title}" захиалга үйлчилгээ үзүүлэгчээс цуцлагдлаа`,
              request_id: requestId,
              actor_id: user.id,
            },
          });
        }

        // OPTIMIZED: Invalidate cache to ensure consistency
        await queryClient.invalidateQueries({ queryKey });

        toast.success("Хүсэлт цуцлагдлаа");
        dispatch({ type: "CLOSE_MODAL" });
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
  );

  const handleStartWork = React.useCallback(
    async (requestId: string) => {
      const request = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "in_progress");

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: {
            status: "in_progress",
            started_at: new Date().toISOString(),
          },
        });

        // Create notification for client
        if (request && user?.id) {
          createNotification.mutate({
            data: {
              user_id: request.client_id,
              type: "work_started",
              title: "Ажил эхэллээ",
              message: `"${request.listing.title}" ажил эхэллээ`,
              request_id: requestId,
              actor_id: user.id,
            },
          });
        }

        // OPTIMIZED: Invalidate cache to ensure consistency
        await queryClient.invalidateQueries({ queryKey });

        toast.success("Ажил эхэллээ!");
        dispatch({ type: "CLOSE_MODAL" });
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
  );

  // Legacy handleComplete - no longer used in new workflow
  const handleComplete = React.useCallback(
    async (_requestId: string) => {
      // This is now handled by opening ProviderCompletionForm directly
    },
    []
  );

  // Step 2: Client confirms and leaves review (awaiting_client_confirmation -> awaiting_payment)
  const handleClientConfirmCompletion = React.useCallback(
    async (requestId: string, rating: number, comment: string) => {
      const request = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "awaiting_payment");

      try {
        // Update request status to awaiting_payment
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "awaiting_payment" },
        });

        // Create review
        if (request && user?.id) {
          await createReview.mutateAsync({
            data: {
              request_id: requestId,
              client_id: user.id,
              provider_id: request.provider_id,
              rating,
              comment: comment || null,
            },
          });
        }

        // Create notification for provider - ready for payment
        if (request && user?.id) {
          createNotification.mutate({
            data: {
              user_id: request.provider_id,
              type: "client_confirmed_completion",
              title: "Захиалагч баталгаажууллаа",
              message: `"${request.listing.title}" ажлыг захиалагч баталгаажууллаа. Төлбөр хүлээгдэж байна.`,
              request_id: requestId,
              actor_id: user.id,
            },
          });
        }

        // OPTIMIZED: Invalidate cache to ensure consistency
        await queryClient.invalidateQueries({ queryKey });

        toast.success("Амжилттай баталгаажууллаа!");
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createReview, createNotification, user?.id, queryClient, queryKey]
  );

  // Step 2: Provider submits work details (in_progress -> awaiting_client_confirmation)
  // Changed workflow: Provider writes report FIRST, then client confirms
  const handleProviderSubmitDetails = React.useCallback(
    async (requestId: string, description: string, photoUrls: string[]) => {
      const request = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "awaiting_client_confirmation", {
        completion_description: description,
        completion_photos: photoUrls,
      });

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: {
            status: "awaiting_client_confirmation",
            completion_description: description,
            completion_photos: photoUrls,
          },
        });

        // Create notification for client
        if (request && user?.id) {
          createNotification.mutate({
            data: {
              user_id: request.client_id,
              type: "work_awaiting_confirmation",
              title: "Ажил дууссаныг баталгаажуулна уу",
              message: `"${request.listing.title}" ажил дууслаа. Баталгаажуулна уу.`,
              request_id: requestId,
              actor_id: user.id,
            },
          });
        }

        // OPTIMIZED: Invalidate cache to ensure consistency
        await queryClient.invalidateQueries({ queryKey });

        toast.success("Ажлын тайлан илгээгдлээ!");
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
  );

  // Step 3: Payment complete (awaiting_payment -> completed)
  const handlePaymentComplete = React.useCallback(
    async (requestId: string) => {
      const request = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId);
      const oldStatus = request?.status;
      optimisticUpdate(requestId, "completed", { completed_at: new Date() });

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "completed", completed_at: new Date() },
        });

        // OPTIMIZED: Create notifications for both parties in parallel
        if (request && user?.id) {
          Promise.all([
            // Notification for client
            createNotification.mutateAsync({
              data: {
                user_id: request.client_id,
                type: "work_completed",
                title: "Ажил дууслаа",
                message: `"${request.listing.title}" ажил амжилттай дууслаа. Баярлалаа!`,
                request_id: requestId,
                actor_id: user.id,
              },
            }),
            // Notification for provider
            createNotification.mutateAsync({
              data: {
                user_id: request.provider_id,
                type: "payment_received",
                title: "Төлбөр хүлээн авлаа",
                message: `"${request.listing.title}" ажлын төлбөр хүлээн авлаа. Баярлалаа!`,
                request_id: requestId,
                actor_id: user.id,
              },
            }),
          ]).catch(() => {
            // Silently fail - notifications are not critical
          });
        }

        // OPTIMIZED: Invalidate cache to ensure consistency
        await queryClient.invalidateQueries({ queryKey });
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
  );

  const handleDelete = React.useCallback(async () => {
    if (!requestToDelete) return;

    try {
      await deleteRequest.mutateAsync({
        where: { id: requestToDelete },
      });
      // Remove from cache - используем setQueriesData для partial key match
      queryClient.setQueriesData<RequestWithRelations[]>(
        { queryKey },
        (old) => {
          if (!old) return old;
          return old.filter((req) => req.id !== requestToDelete);
        }
      );
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

  const handleCloseModal = React.useCallback(() => {
    dispatch({ type: "CLOSE_MODAL" });
  }, []);

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
      isUpdating: updateRequest.isPending,
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
      updateRequest.isPending,
      deleteRequest.isPending,
    ]
  );

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle highlight and openChat URL parameters from notifications
  React.useEffect(() => {
    if (!highlightRequestId || !allRequests || requestsLoading) return;

    const requestToHighlight = (allRequests as RequestWithRelations[])?.find(
      (r) => r.id === highlightRequestId
    );

    if (requestToHighlight && !selectedRequest) {
      // If openChat param is present, open chat directly
      if (openChatParam === "true") {
        dispatch({ type: "OPEN_CHAT_FOR_REQUEST", payload: requestToHighlight });
      } else {
        dispatch({ type: "SET_SELECTED_REQUEST", payload: requestToHighlight });
      }
      // Clear URL params after handling
      router.replace("/account/me/requests", { scroll: false });
    }
  }, [highlightRequestId, openChatParam, allRequests, requestsLoading, selectedRequest, router]);

  // Handle request URL parameter - restore open modal on page refresh
  React.useEffect(() => {
    const requestIdFromUrl = searchParams.get("request");
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
    const requestIdFromUrl = searchParams.get("request");

    // If a request is selected but not in URL, add it
    if (selectedRequest && requestIdFromUrl !== selectedRequest.id) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("request", selectedRequest.id);
      router.replace(`/account/me/requests?${params.toString()}`, { scroll: false });
    }

    // If no request is selected but URL has one, remove it
    if (!selectedRequest && requestIdFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("request");
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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => router.push("/")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Link href="/">
              <h1 className="text-lg md:text-2xl font-bold">
                <span className="text-[#c4272f]">Uilc</span>
                <span className="text-[#015197]">hilge</span>
                <span className="text-[#c4272f]">e.mn</span>
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

      <main className="container mx-auto px-4 py-4 md:py-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Хүсэлтүүд</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Хайх..."
            value={searchInput}
            onChange={(e) => dispatch({ type: "SET_SEARCH_INPUT", payload: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="inline-flex p-1 h-10 md:h-11 bg-muted/50 rounded-full">
              <TabsTrigger
                value="my_requests"
                className="rounded-full px-3 md:px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs md:text-sm font-medium"
              >
                <Send className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Илгээсэн</span>
                {myRequests.length > 0 && (
                  <span className="ml-1 md:ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold min-w-5 text-center">
                    {myRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="incoming"
                className="rounded-full px-3 md:px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs md:text-sm font-medium"
              >
                <Inbox className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Ирсэн</span>
                {incomingRequests.length > 0 && (
                  <span className="ml-1 md:ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold min-w-5 text-center">
                    {incomingRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="active_jobs"
                className="rounded-full px-3 md:px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs md:text-sm font-medium"
              >
                <Play className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Явагдаж буй</span>
                {activeJobs.length > 0 && (
                  <span className="ml-1 md:ml-2 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold min-w-5 text-center">
                    {activeJobs.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* My Requests - миний илгээсэн хүсэлтүүд */}
          <TabsContent value="my_requests" className="mt-0">
            {requestsLoading ? (
              <LoadingState />
            ) : filteredMyRequests.length === 0 ? (
              <EmptyState
                icon={<Send className="h-12 w-12" />}
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
                    isUpdating={updateRequest.isPending}
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
                icon={<Inbox className="h-12 w-12" />}
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
                    isUpdating={updateRequest.isPending}
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
                icon={<Play className="h-12 w-12" />}
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
                      className="relative w-full text-left bg-card border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all"
                    >
                      {/* Status indicator bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        request.status === "in_progress"
                          ? "bg-gradient-to-r from-blue-500 to-blue-400"
                          : isVirtualActive
                            ? "bg-gradient-to-r from-amber-500 to-orange-400"
                            : "bg-gradient-to-r from-green-500 to-emerald-500"
                      }`} />

                      <div className="p-3 pt-4">
                        {/* Top row: status badge + service info */}
                        <div className="flex items-start gap-3">
                          {/* Service image */}
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                            <Image
                              src={getListingImage(request.listing)}
                              alt={request.listing.title}
                              fill
                              className="object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm line-clamp-1">
                                {request.listing.title}
                              </h3>
                              {/* Price display */}
                              {request.proposed_price ? (
                                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                  {Number(request.proposed_price).toLocaleString()}₮
                                </span>
                              ) : request.listing.is_negotiable ? (
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                  Тохиролцоно
                                </span>
                              ) : request.listing.price ? (
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                  {Number(request.listing.price).toLocaleString()}₮
                                </span>
                              ) : null}
                              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                request.status === "in_progress"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                  : isVirtualActive
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  request.status === "in_progress"
                                    ? "bg-blue-500 animate-pulse"
                                    : isVirtualActive
                                      ? "bg-amber-500 animate-pulse"
                                      : "bg-green-500"
                                }`} />
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
                                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                                  <div className="relative w-5 h-5 rounded-full overflow-hidden bg-muted shrink-0">
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
                                  <span className="font-medium text-foreground truncate">{getPersonName(person)}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Message - compact */}
                        {request.message && (
                          <div className="mt-2 px-2 py-1.5 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 shrink-0" />
                              <span className="truncate">{request.message}</span>
                            </p>
                          </div>
                        )}

                        {/* Details row - inline */}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{preferredDateStr || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{request.preferred_time || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {request.listing.service_type === "remote"
                                ? // remote = клиент приходит к исполнителю, показываем адрес исполнителя
                                  request.listing.address || "—"
                                : // on_site = исполнитель едет к клиенту, показываем адрес клиента из заявки
                                  request.address_detail ||
                                  (request.aimag
                                    ? [request.aimag.name, request.district?.name, request.khoroo?.name].filter(Boolean).join(", ")
                                    : "—")}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-3 flex gap-2">
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
                                  disabled={updateRequest.isPending}
                                  className="flex-1 h-9 px-3 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                                  className="flex-1 h-9 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5"
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
                              {(request.status === "accepted" || request.status === "in_progress") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelByProvider(request.id);
                                  }}
                                  disabled={updateRequest.isPending}
                                  className="flex-1 h-9 px-3 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                                    dispatch({ type: "OPEN_START_WORK_DIALOG", payload: request.id });
                                  }}
                                  disabled={updateRequest.isPending}
                                  className="flex-1 h-9 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  {updateRequest.isPending ? (
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
                                    dispatch({ type: "OPEN_COMPLETION_FOR_REQUEST", payload: request });
                                  }}
                                  disabled={updateRequest.isPending}
                                  className="flex-1 h-9 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  {updateRequest.isPending ? (
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
                                  className="flex-1 h-9 px-3 rounded-lg text-xs font-semibold bg-gray-400 text-white transition-colors flex items-center justify-center gap-1.5 opacity-50 cursor-not-allowed"
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
                                  disabled={updateRequest.isPending}
                                  className="flex-1 h-9 px-3 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
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
      </main>

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
          onCompletionFormOpened={() => dispatch({ type: "SET_SHOULD_OPEN_COMPLETION_FORM", payload: false })}
          autoOpenQRPayment={shouldOpenQRPayment}
          onQRPaymentOpened={() => dispatch({ type: "SET_SHOULD_OPEN_QR_PAYMENT", payload: false })}
          onProposePrice={handleProposePrice}
          onConfirmPrice={handleConfirmPrice}
          onRejectPrice={handleRejectPrice}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !open && dispatch({ type: "CLOSE_DELETE_DIALOG" })}>
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
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteRequest.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Work Confirmation Dialog */}
      <AlertDialog open={startWorkDialogOpen} onOpenChange={(open) => !open && dispatch({ type: "CLOSE_START_WORK_DIALOG" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ажил эхлүүлэх үү?</AlertDialogTitle>
            <AlertDialogDescription>
              Та энэ ажлыг эхлүүлэхдээ итгэлтэй байна уу? Ажил эхэлсний дараа захиалагч үүнийг харах болно.
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateRequest.isPending ? (
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

export default function RequestsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <RequestsPageContent />
    </Suspense>
  );
}
