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
  AlertTriangle,
  MessageCircle,
  CreditCard,
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

function RequestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // OPTIMIZED: Debounced search to prevent excessive re-renders
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const [selectedRequest, setSelectedRequest] = React.useState<RequestWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [requestToDelete, setRequestToDelete] = React.useState<string | null>(null);
  const [startWorkDialogOpen, setStartWorkDialogOpen] = React.useState(false);
  const [requestToStart, setRequestToStart] = React.useState<string | null>(null);
  const [shouldOpenChat, setShouldOpenChat] = React.useState(false);
  const [shouldOpenCompletionForm, setShouldOpenCompletionForm] = React.useState(false);
  const [shouldOpenQRPayment, setShouldOpenQRPayment] = React.useState(false);

  // Check for highlight and openChat params from notifications
  const highlightRequestId = searchParams.get("highlight");
  const openChatParam = searchParams.get("openChat");

  // Query key для invalidation - используем findMany prefix как ZenStack
  const queryKey = React.useMemo(
    () => ["listing_requests", "findMany"],
    []
  );

  // REALTIME: Подписка на изменения статусов заявок
  useRealtimeRequests({
    showToasts: true, // Показывать toast уведомления при изменении статуса
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
            phone: true,
            latitude: true,
            longitude: true,
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
        aimag: { select: { id: true, name: true, latitude: true, longitude: true } },
        district: { select: { id: true, name: true, latitude: true, longitude: true } },
        khoroo: { select: { id: true, name: true, latitude: true, longitude: true } },
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

  // Преобразуем Decimal координаты в числа (Prisma возвращает строки)
  const normalizedRequests = React.useMemo(() => {
    const all = (allRequests as RequestWithRelations[] | undefined) || [];
    return all.map(req => ({
      ...req,
      latitude: req.latitude != null ? Number(req.latitude) : null,
      longitude: req.longitude != null ? Number(req.longitude) : null,
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

  // Мемоизированная фильтрация
  const filteredMyRequests = React.useMemo(() => {
    if (!searchQuery) return myRequests;
    const query = searchQuery.toLowerCase();
    return myRequests.filter(
      (req) =>
        req.listing.title.toLowerCase().includes(query) ||
        req.message.toLowerCase().includes(query) ||
        getPersonName(req.client).toLowerCase().includes(query) ||
        getPersonName(req.provider).toLowerCase().includes(query)
    );
  }, [myRequests, searchQuery]);

  const filteredIncomingRequests = React.useMemo(() => {
    if (!searchQuery) return incomingRequests;
    const query = searchQuery.toLowerCase();
    return incomingRequests.filter(
      (req) =>
        req.listing.title.toLowerCase().includes(query) ||
        req.message.toLowerCase().includes(query) ||
        getPersonName(req.client).toLowerCase().includes(query) ||
        getPersonName(req.provider).toLowerCase().includes(query)
    );
  }, [incomingRequests, searchQuery]);

  const filteredActiveJobs = React.useMemo(() => {
    if (!searchQuery) return activeJobs;
    const query = searchQuery.toLowerCase();
    return activeJobs.filter(
      (req) =>
        req.listing.title.toLowerCase().includes(query) ||
        req.message.toLowerCase().includes(query) ||
        getPersonName(req.client).toLowerCase().includes(query)
    );
  }, [activeJobs, searchQuery]);

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
        setSelectedRequest((prev) =>
          prev ? { ...prev, status: newStatus, ...additionalData } : null
        );
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
        setSelectedRequest((prev) => (prev ? { ...prev, status: oldStatus } : null));
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

        toast.success("Хүсэлт зөвшөөрөгдлөө!", {
          action: {
            label: "Буцаах",
            onClick: () => {
              if (oldStatus) {
                updateRequest.mutate({
                  where: { id: requestId },
                  data: { status: oldStatus, accepted_at: null },
                });
                revertOptimisticUpdate(requestId, oldStatus);
              }
            },
          },
        });
        setSelectedRequest(null);
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest, createNotification, user?.id, queryClient, queryKey]
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

        toast.success("Хүсэлт татгалзагдлаа", {
          action: {
            label: "Буцаах",
            onClick: () => {
              if (oldStatus) {
                updateRequest.mutate({
                  where: { id: requestId },
                  data: { status: oldStatus },
                });
                revertOptimisticUpdate(requestId, oldStatus);
              }
            },
          },
        });
        setSelectedRequest(null);
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

        toast.success("Хүсэлт цуцлагдлаа", {
          action: {
            label: "Буцаах",
            onClick: () => {
              if (oldStatus) {
                updateRequest.mutate({
                  where: { id: requestId },
                  data: { status: oldStatus },
                });
                revertOptimisticUpdate(requestId, oldStatus);
              }
            },
          },
        });
        setSelectedRequest(null);
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

        toast.success("Хүсэлт цуцлагдлаа", {
          action: {
            label: "Буцаах",
            onClick: () => {
              if (oldStatus) {
                updateRequest.mutate({
                  where: { id: requestId },
                  data: { status: oldStatus },
                });
                revertOptimisticUpdate(requestId, oldStatus);
              }
            },
          },
        });
        setSelectedRequest(null);
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
        setSelectedRequest(null);
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

        toast.success("Төлбөр амжилттай!");
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
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
      setSelectedRequest(null);
    } catch {
      toast.error("Алдаа гарлаа");
    }
  }, [requestToDelete, deleteRequest, queryClient, queryKey]);

  const handleSelectRequest = React.useCallback((request: RequestWithRelations) => {
    setSelectedRequest(request);
  }, []);

  // Open chat directly from list item
  const handleOpenChat = React.useCallback((request: RequestWithRelations) => {
    setSelectedRequest(request);
    setShouldOpenChat(true);
  }, []);

  const handleCloseModal = React.useCallback(() => {
    setSelectedRequest(null);
  }, []);

  const handleDeleteRequest = React.useCallback(() => {
    if (selectedRequest) {
      setRequestToDelete(selectedRequest.id);
      setDeleteDialogOpen(true);
    }
  }, [selectedRequest]);

  // Actions object for modal
  const actions: RequestActions = React.useMemo(
    () => ({
      onAccept: handleAccept,
      onReject: handleReject,
      onCancelByClient: handleCancelByClient,
      onCancelByProvider: handleCancelByProvider,
      onStartWork: handleStartWork,
      onComplete: handleComplete,
      onDelete: handleDeleteRequest,
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
      handleDeleteRequest,
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
      setSelectedRequest(requestToHighlight);
      // If openChat param is present, set flag to open chat
      if (openChatParam === "true") {
        setShouldOpenChat(true);
      }
      // Clear URL params after handling
      router.replace("/account/me/requests", { scroll: false });
    }
  }, [highlightRequestId, openChatParam, allRequests, requestsLoading, selectedRequest, router]);

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
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my_requests" className="w-full">
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

                  // Check if request is overdue
                  const overdueInfo = checkRequestOverdue(
                    request.status,
                    request.created_at,
                    request.preferred_date,
                    request.preferred_time
                  );

                  return (
                    <button
                      type="button"
                      key={request.id}
                      onClick={() => handleSelectRequest(request)}
                      className={`relative w-full text-left bg-card border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all ${
                        overdueInfo.isOverdue ? "border-red-300 dark:border-red-800" : ""
                      }`}
                    >
                      {/* Status indicator bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        overdueInfo.isOverdue
                          ? "bg-gradient-to-r from-red-500 to-red-400"
                          : request.status === "in_progress"
                            ? "bg-gradient-to-r from-blue-500 to-blue-400"
                            : isVirtualActive
                              ? "bg-gradient-to-r from-amber-500 to-orange-400"
                              : "bg-gradient-to-r from-green-500 to-emerald-500"
                      }`} />

                      <div className="p-3 pt-4">
                        {/* Overdue warning banner */}
                        {overdueInfo.isOverdue && (
                          <div className="mb-2 -mx-3 -mt-4 px-3 py-2 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span className="text-xs font-medium">{overdueInfo.message}</span>
                            </div>
                          </div>
                        )}

                        {/* Near deadline warning */}
                        {!overdueInfo.isOverdue && overdueInfo.message && (
                          <div className="mb-2 -mx-3 -mt-4 px-3 py-2 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                              <Clock className="h-4 w-4 shrink-0" />
                              <span className="text-xs font-medium">{overdueInfo.message}</span>
                            </div>
                          </div>
                        )}

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
                              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                overdueInfo.isOverdue
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                  : request.status === "in_progress"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                    : isVirtualActive
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                      : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  overdueInfo.isOverdue
                                    ? "bg-red-500 animate-pulse"
                                    : request.status === "in_progress"
                                      ? "bg-blue-500 animate-pulse"
                                      : isVirtualActive
                                        ? "bg-amber-500 animate-pulse"
                                        : "bg-green-500"
                                }`} />
                                {overdueInfo.isOverdue
                                  ? "Хугацаа хэтэрсэн"
                                  : request.status === "in_progress"
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
                          {/* Chat button - for both client and provider */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenChat(request);
                            }}
                            className="flex-1 h-9 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1.5"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Чат
                          </button>

                          {/* Client action - Confirm completion */}
                          {request.client_id === user?.id && request.status === "awaiting_client_confirmation" && (
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

                          {/* Provider actions */}
                          {request.provider_id === user?.id && (
                            <>
                              {request.status === "accepted" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRequestToStart(request.id);
                                    setStartWorkDialogOpen(true);
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
                                    setSelectedRequest(request);
                                    setShouldOpenCompletionForm(true);
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
                                    setSelectedRequest(request);
                                    setShouldOpenQRPayment(true);
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
          onDeleteRequest={handleDeleteRequest}
          autoOpenChat={shouldOpenChat}
          onChatOpened={() => setShouldOpenChat(false)}
          autoOpenCompletionForm={shouldOpenCompletionForm}
          onCompletionFormOpened={() => setShouldOpenCompletionForm(false)}
          autoOpenQRPayment={shouldOpenQRPayment}
          onQRPaymentOpened={() => setShouldOpenQRPayment(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
      <AlertDialog open={startWorkDialogOpen} onOpenChange={setStartWorkDialogOpen}>
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
                setStartWorkDialogOpen(false);
                setRequestToStart(null);
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
