"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
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
} from "@/lib/hooks";
import { CACHE_TIMES } from "@/lib/react-query-config";
import {
  RequestListItem,
  type RequestWithRelations,
  type RequestActions,
  getPersonName,
} from "./_components";

// Lazy load heavy components
const RequestDetailModal = dynamic(
  () => import("./_components/request-detail-modal").then((mod) => ({ default: mod.RequestDetailModal })),
  { ssr: false }
);

const ActiveRequestsSidebar = dynamic(
  () => import("@/components/active-requests-sidebar").then((mod) => ({ default: mod.ActiveRequestsSidebar })),
  { ssr: false }
);

// Кнопка "Ажилд" для мобильного header
const MobileActiveRequestsButton = React.memo(function MobileActiveRequestsButton({
  count,
}: {
  count: number;
}) {
  if (count === 0) return null;

  const handleClick = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-active-requests-sidebar"));
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden relative h-9 w-9"
      onClick={handleClick}
    >
      <Play className="h-5 w-5 text-blue-500" />
      <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-blue-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
        {count > 99 ? "99+" : count}
      </span>
    </Button>
  );
});

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

export default function RequestsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRequest, setSelectedRequest] = React.useState<RequestWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [requestToDelete, setRequestToDelete] = React.useState<string | null>(null);

  // Query key для invalidation
  const queryKey = React.useMemo(
    () => ["listing_requests", { where: { OR: [{ client_id: user?.id }, { provider_id: user?.id }] } }],
    [user?.id]
  );

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
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
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
        aimag: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        khoroo: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
    },
    {
      enabled: !!user?.id,
      ...CACHE_TIMES.SERVICE_REQUESTS,
    }
  );

  // Разделяем на клиентские и провайдерские на клиенте (O(n) один раз)
  const { myRequests, incomingRequests } = React.useMemo(() => {
    const all = (allRequests as RequestWithRelations[] | undefined) || [];
    const my: RequestWithRelations[] = [];
    const incoming: RequestWithRelations[] = [];

    for (const req of all) {
      if (req.client_id === user?.id) {
        my.push(req);
      }
      if (req.provider_id === user?.id) {
        incoming.push(req);
      }
    }

    return { myRequests: my, incomingRequests: incoming };
  }, [allRequests, user?.id]);

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

  // Active requests count for mobile button
  const activeRequestsCount = React.useMemo(
    () => incomingRequests.filter((r) => r.status === "accepted" || r.status === "in_progress").length,
    [incomingRequests]
  );

  // Mutations
  const updateRequest = useUpdatelisting_requests();
  const deleteRequest = useDeletelisting_requests();

  // Optimistic update helper
  const optimisticUpdate = React.useCallback(
    (requestId: string, newStatus: RequestWithRelations["status"], additionalData?: Partial<RequestWithRelations>) => {
      // Update cache optimistically
      queryClient.setQueryData(queryKey, (old: RequestWithRelations[] | undefined) => {
        if (!old) return old;
        return old.map((req) =>
          req.id === requestId
            ? { ...req, status: newStatus, ...additionalData }
            : req
        );
      });

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
      queryClient.setQueryData(queryKey, (old: RequestWithRelations[] | undefined) => {
        if (!old) return old;
        return old.map((req) =>
          req.id === requestId ? { ...req, status: oldStatus } : req
        );
      });
      if (selectedRequest?.id === requestId) {
        setSelectedRequest((prev) => (prev ? { ...prev, status: oldStatus } : null));
      }
    },
    [queryClient, queryKey, selectedRequest?.id]
  );

  // Action handlers with optimistic updates
  const handleAccept = React.useCallback(
    async (requestId: string) => {
      const oldStatus = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId)?.status;
      optimisticUpdate(requestId, "accepted", { accepted_at: new Date() });

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "accepted", accepted_at: new Date() },
        });
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
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest]
  );

  const handleReject = React.useCallback(
    async (requestId: string) => {
      const oldStatus = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId)?.status;
      optimisticUpdate(requestId, "rejected");

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "rejected" },
        });
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
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest]
  );

  const handleCancelByClient = React.useCallback(
    async (requestId: string) => {
      const oldStatus = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId)?.status;
      optimisticUpdate(requestId, "cancelled_by_client");

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "cancelled_by_client" },
        });
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
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest]
  );

  const handleCancelByProvider = React.useCallback(
    async (requestId: string) => {
      const oldStatus = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId)?.status;
      optimisticUpdate(requestId, "cancelled_by_provider");

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "cancelled_by_provider" },
        });
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
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest]
  );

  const handleStartWork = React.useCallback(
    async (requestId: string) => {
      const oldStatus = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId)?.status;
      optimisticUpdate(requestId, "in_progress");

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "in_progress" },
        });
        toast.success("Ажил эхэллээ!");
        setSelectedRequest(null);
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest]
  );

  const handleComplete = React.useCallback(
    async (requestId: string) => {
      const oldStatus = (allRequests as RequestWithRelations[])?.find((r) => r.id === requestId)?.status;
      optimisticUpdate(requestId, "completed", { completed_at: new Date() });

      try {
        await updateRequest.mutateAsync({
          where: { id: requestId },
          data: { status: "completed", completed_at: new Date() },
        });
        toast.success("Ажил дууслаа!");
        setSelectedRequest(null);
      } catch {
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        toast.error("Алдаа гарлаа");
      }
    },
    [allRequests, optimisticUpdate, revertOptimisticUpdate, updateRequest]
  );

  const handleDelete = React.useCallback(async () => {
    if (!requestToDelete) return;

    try {
      await deleteRequest.mutateAsync({
        where: { id: requestToDelete },
      });
      // Remove from cache
      queryClient.setQueryData(queryKey, (old: RequestWithRelations[] | undefined) => {
        if (!old) return old;
        return old.filter((req) => req.id !== requestToDelete);
      });
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
          {/* Mobile Active Requests Button */}
          <MobileActiveRequestsButton count={activeRequestsCount} />
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my_requests" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="inline-flex p-1 h-11 bg-muted/50 rounded-full">
              <TabsTrigger
                value="my_requests"
                className="rounded-full px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium"
              >
                <Send className="h-4 w-4 mr-2" />
                Илгээсэн
                {myRequests.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold min-w-5 text-center">
                    {myRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="incoming"
                className="rounded-full px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium"
              >
                <Inbox className="h-4 w-4 mr-2" />
                Ирсэн
                {incomingRequests.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold min-w-5 text-center">
                    {incomingRequests.length}
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
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onCancelByProvider={handleCancelByProvider}
                    isUpdating={updateRequest.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Active Requests Sidebar - показывает заявки в работе */}
      <ActiveRequestsSidebar
        requests={incomingRequests}
        onSelectRequest={(request) => setSelectedRequest(request as RequestWithRelations)}
      />

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          userId={user.id}
          actions={actions}
          onClose={handleCloseModal}
          onDeleteRequest={handleDeleteRequest}
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
    </div>
  );
}
