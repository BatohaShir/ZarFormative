"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  ChevronLeft,
  Search,
  Send,
  Inbox,
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  User,
  X,
  Check,
  Trash2,
  AlertCircle,
  Play,
  XCircle,
  MessageSquare,
  Loader2,
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
import { Badge } from "@/components/ui/badge";
import {
  useFindManylisting_requests,
  useUpdatelisting_requests,
  useDeletelisting_requests,
} from "@/lib/hooks";
import type { RequestStatus } from "@prisma/client";

// Тип для заявки из БД
interface RequestWithRelations {
  id: string;
  listing_id: string;
  client_id: string;
  provider_id: string;
  message: string;
  status: RequestStatus;
  provider_response: string | null;
  created_at: Date;
  updated_at: Date;
  accepted_at: Date | null;
  completed_at: Date | null;
  listing: {
    id: string;
    title: string;
    slug: string;
    images: Array<{
      url: string;
      is_cover: boolean;
    }>;
  };
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    is_company: boolean;
    avatar_url: string | null;
  };
  provider: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    is_company: boolean;
    avatar_url: string | null;
  };
}

function formatCreatedAt(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) {
    return `${minutes} минутын өмнө`;
  } else if (hours < 24) {
    return `${hours} цагийн өмнө`;
  } else if (days < 7) {
    return `${days} өдрийн өмнө`;
  } else {
    return d.toLocaleDateString("mn-MN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

function getStatusBadge(status: RequestStatus) {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
        >
          <Clock className="h-3 w-3 mr-1" />
          Хүлээгдэж буй
        </Badge>
      );
    case "accepted":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
        >
          <Check className="h-3 w-3 mr-1" />
          Зөвшөөрсөн
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
        >
          <XCircle className="h-3 w-3 mr-1" />
          Татгалзсан
        </Badge>
      );
    case "in_progress":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
        >
          <Play className="h-3 w-3 mr-1" />
          Ажиллаж байна
        </Badge>
      );
    case "completed":
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Дууссан
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800"
        >
          <X className="h-3 w-3 mr-1" />
          Цуцалсан
        </Badge>
      );
    case "disputed":
      return (
        <Badge
          variant="outline"
          className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Маргаантай
        </Badge>
      );
    default:
      return null;
  }
}

function getPersonName(person: {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  is_company: boolean;
}): string {
  if (person.is_company && person.company_name) {
    return person.company_name;
  }
  const parts = [person.first_name, person.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Хэрэглэгч";
}

function getListingImage(listing: RequestWithRelations["listing"]): string {
  const coverImage = listing.images?.find((img) => img.is_cover);
  return coverImage?.url || listing.images?.[0]?.url || "/placeholder-service.jpg";
}

export default function RequestsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRequest, setSelectedRequest] = React.useState<RequestWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [requestToDelete, setRequestToDelete] = React.useState<string | null>(null);

  // Fetch my sent requests (я как клиент)
  const {
    data: myRequests,
    isLoading: myRequestsLoading,
    refetch: refetchMyRequests,
  } = useFindManylisting_requests(
    {
      where: {
        client_id: user?.id || "",
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
      },
      orderBy: { created_at: "desc" },
    },
    {
      enabled: !!user?.id,
    }
  );

  // Fetch incoming requests (я как provider)
  const {
    data: incomingRequests,
    isLoading: incomingLoading,
    refetch: refetchIncoming,
  } = useFindManylisting_requests(
    {
      where: {
        provider_id: user?.id || "",
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
      },
      orderBy: { created_at: "desc" },
    },
    {
      enabled: !!user?.id,
    }
  );

  // Mutations
  const updateRequest = useUpdatelisting_requests();
  const deleteRequest = useDeletelisting_requests();

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

  if (!isAuthenticated) {
    return null;
  }

  // Filter by type
  const myRequestsList = (myRequests as RequestWithRelations[] | undefined) || [];
  const incomingRequestsList = (incomingRequests as RequestWithRelations[] | undefined) || [];

  // Active = accepted or in_progress (from both sides)
  const activeFromMy = myRequestsList.filter(
    (r) => r.status === "accepted" || r.status === "in_progress"
  );
  const activeFromIncoming = incomingRequestsList.filter(
    (r) => r.status === "accepted" || r.status === "in_progress"
  );
  const activeRequests = [...activeFromMy, ...activeFromIncoming];

  // Pending incoming for provider
  const pendingIncoming = incomingRequestsList.filter((r) => r.status === "pending");

  const filterRequests = (reqs: RequestWithRelations[]) => {
    if (!searchQuery) return reqs;
    const query = searchQuery.toLowerCase();
    return reqs.filter(
      (req) =>
        req.listing.title.toLowerCase().includes(query) ||
        req.message.toLowerCase().includes(query) ||
        getPersonName(req.client).toLowerCase().includes(query) ||
        getPersonName(req.provider).toLowerCase().includes(query)
    );
  };

  const handleAccept = async (requestId: string) => {
    try {
      await updateRequest.mutateAsync({
        where: { id: requestId },
        data: {
          status: "accepted",
          accepted_at: new Date(),
        },
      });
      toast.success("Хүсэлт зөвшөөрөгдлөө!");
      refetchIncoming();
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Алдаа гарлаа");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await updateRequest.mutateAsync({
        where: { id: requestId },
        data: { status: "rejected" },
      });
      toast.success("Хүсэлт татгалзагдлаа");
      refetchIncoming();
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Алдаа гарлаа");
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await updateRequest.mutateAsync({
        where: { id: requestId },
        data: { status: "cancelled" },
      });
      toast.success("Хүсэлт цуцлагдлаа");
      refetchMyRequests();
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Алдаа гарлаа");
    }
  };

  const handleDelete = async () => {
    if (!requestToDelete) return;
    try {
      await deleteRequest.mutateAsync({
        where: { id: requestToDelete },
      });
      toast.success("Хүсэлт устгагдлаа");
      refetchMyRequests();
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Алдаа гарлаа");
    }
  };

  const handleStartWork = async (requestId: string) => {
    try {
      await updateRequest.mutateAsync({
        where: { id: requestId },
        data: { status: "in_progress" },
      });
      toast.success("Ажил эхэллээ!");
      refetchIncoming();
      refetchMyRequests();
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Алдаа гарлаа");
    }
  };

  const handleComplete = async (requestId: string) => {
    try {
      await updateRequest.mutateAsync({
        where: { id: requestId },
        data: {
          status: "completed",
          completed_at: new Date(),
        },
      });
      toast.success("Ажил дууслаа!");
      refetchIncoming();
      refetchMyRequests();
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Алдаа гарлаа");
    }
  };

  const isLoading = myRequestsLoading || incomingLoading;

  const renderRequestCard = (request: RequestWithRelations, type: "sent" | "received") => {
    const isMyRequest = type === "sent";
    const otherPerson = isMyRequest ? request.provider : request.client;

    return (
      <div
        key={request.id}
        className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedRequest(request)}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={getListingImage(request.listing)}
              alt={request.listing.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm md:text-base line-clamp-1">
                {request.listing.title}
              </h3>
              {getStatusBadge(request.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatCreatedAt(request.created_at)}
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{request.message}</p>

        {/* Person Info */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted">
              {otherPerson.avatar_url ? (
                <Image
                  src={otherPerson.avatar_url}
                  alt=""
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{getPersonName(otherPerson)}</p>
              <p className="text-xs text-muted-foreground">
                {isMyRequest ? "Үйлчилгээ үзүүлэгч" : "Захиалагч"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions for Incoming Pending */}
        {!isMyRequest && request.status === "pending" && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                handleReject(request.id);
              }}
              disabled={updateRequest.isPending}
            >
              <X className="h-4 w-4 mr-1" />
              Татгалзах
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={(e) => {
                e.stopPropagation();
                handleAccept(request.id);
              }}
              disabled={updateRequest.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Хүлээн авах
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderEmptyState = (icon: React.ReactNode, title: string, description: string) => (
    <div className="col-span-full text-center py-8 md:py-12 text-muted-foreground">
      <div className="mx-auto mb-3 opacity-50">{icon}</div>
      <p className="text-sm md:text-base">{title}</p>
      <p className="text-xs mt-1">{description}</p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <Skeleton className="w-16 h-16 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );

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
          <TabsList className="w-full mb-4 h-10">
            <TabsTrigger value="my_requests" className="flex-1 text-xs md:text-sm">
              <Send className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
              Миний хүсэлт ({myRequestsList.length})
            </TabsTrigger>
            <TabsTrigger value="incoming" className="flex-1 text-xs md:text-sm">
              <Inbox className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
              Ирсэн ({pendingIncoming.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1 text-xs md:text-sm">
              <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
              Идэвхтэй ({activeRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* My Requests - миний илгээсэн хүсэлтүүд */}
          <TabsContent value="my_requests">
            {isLoading ? (
              renderLoadingState()
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterRequests(myRequestsList).length === 0
                  ? renderEmptyState(
                      <Send className="h-10 w-10 md:h-12 md:w-12" />,
                      "Илгээсэн хүсэлт байхгүй",
                      "Та үйлчилгээнд хүсэлт илгээхэд энд харагдана"
                    )
                  : filterRequests(myRequestsList).map((r) => renderRequestCard(r, "sent"))}
              </div>
            )}
          </TabsContent>

          {/* Incoming Requests - надад ирсэн хүсэлтүүд */}
          <TabsContent value="incoming">
            {isLoading ? (
              renderLoadingState()
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterRequests(pendingIncoming).length === 0
                  ? renderEmptyState(
                      <Inbox className="h-10 w-10 md:h-12 md:w-12" />,
                      "Ирсэн хүсэлт байхгүй",
                      "Таны үйлчилгээнд сонирхсон хүмүүс энд харагдана"
                    )
                  : filterRequests(pendingIncoming).map((r) => renderRequestCard(r, "received"))}
              </div>
            )}
          </TabsContent>

          {/* Active - идэвхтэй захиалгууд */}
          <TabsContent value="active">
            {isLoading ? (
              renderLoadingState()
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterRequests(activeRequests).length === 0
                  ? renderEmptyState(
                      <CheckCircle className="h-10 w-10 md:h-12 md:w-12" />,
                      "Идэвхтэй захиалга байхгүй",
                      "Хүлээн авсан захиалгууд энд харагдана"
                    )
                  : filterRequests(activeRequests).map((r) =>
                      renderRequestCard(r, r.client_id === user?.id ? "sent" : "received")
                    )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:max-w-lg md:rounded-xl rounded-t-xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Хүсэлтийн дэлгэрэнгүй</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Service Info */}
              <div className="flex gap-4">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={getListingImage(selectedRequest.listing)}
                    alt={selectedRequest.listing.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/services/${selectedRequest.listing.slug}`}
                      className="font-semibold text-lg hover:underline"
                    >
                      {selectedRequest.listing.title}
                    </Link>
                  </div>
                  <div className="mt-2">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              {/* Message */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Мессеж
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedRequest.message}
                </p>
              </div>

              {/* Provider Response */}
              {selectedRequest.provider_response && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">Хариу</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedRequest.provider_response}
                  </p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Илгээсэн</span>
                  </div>
                  <p className="text-sm font-medium">{formatCreatedAt(selectedRequest.created_at)}</p>
                </div>
                {selectedRequest.accepted_at && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Check className="h-4 w-4" />
                      <span className="text-xs">Зөвшөөрсөн</span>
                    </div>
                    <p className="text-sm font-medium">
                      {formatCreatedAt(selectedRequest.accepted_at)}
                    </p>
                  </div>
                )}
                {selectedRequest.completed_at && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">Дууссан</span>
                    </div>
                    <p className="text-sm font-medium">
                      {formatCreatedAt(selectedRequest.completed_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Person Info */}
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">
                  {selectedRequest.client_id === user?.id ? "Үйлчилгээ үзүүлэгч" : "Захиалагч"}
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {(selectedRequest.client_id === user?.id
                      ? selectedRequest.provider
                      : selectedRequest.client
                    ).avatar_url ? (
                      <Image
                        src={
                          (selectedRequest.client_id === user?.id
                            ? selectedRequest.provider
                            : selectedRequest.client
                          ).avatar_url!
                        }
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {getPersonName(
                        selectedRequest.client_id === user?.id
                          ? selectedRequest.provider
                          : selectedRequest.client
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/account/${
                      selectedRequest.client_id === user?.id
                        ? selectedRequest.provider_id
                        : selectedRequest.client_id
                    }`}
                  >
                    <Button variant="outline" size="sm">
                      Профайл
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-background border-t p-4">
              {/* Actions for INCOMING pending requests (я provider) */}
              {selectedRequest.provider_id === user?.id && selectedRequest.status === "pending" && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={updateRequest.isPending}
                  >
                    {updateRequest.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Татгалзах
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleAccept(selectedRequest.id)}
                    disabled={updateRequest.isPending}
                  >
                    {updateRequest.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Хүлээн авах
                  </Button>
                </div>
              )}

              {/* Actions for ACCEPTED requests (provider can start work) */}
              {selectedRequest.provider_id === user?.id && selectedRequest.status === "accepted" && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Хаах
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleStartWork(selectedRequest.id)}
                    disabled={updateRequest.isPending}
                  >
                    {updateRequest.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Ажил эхлүүлэх
                  </Button>
                </div>
              )}

              {/* Actions for IN_PROGRESS requests (provider can complete) */}
              {selectedRequest.provider_id === user?.id &&
                selectedRequest.status === "in_progress" && (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedRequest(null)}
                    >
                      Хаах
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleComplete(selectedRequest.id)}
                      disabled={updateRequest.isPending}
                    >
                      {updateRequest.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Дуусгах
                    </Button>
                  </div>
                )}

              {/* Actions for MY pending requests (я client - могу отменить) */}
              {selectedRequest.client_id === user?.id && selectedRequest.status === "pending" && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Хаах
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleCancel(selectedRequest.id)}
                    disabled={updateRequest.isPending}
                  >
                    {updateRequest.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Цуцлах
                  </Button>
                </div>
              )}

              {/* Default close button for other states */}
              {((selectedRequest.client_id === user?.id &&
                !["pending"].includes(selectedRequest.status)) ||
                (selectedRequest.provider_id === user?.id &&
                  ["rejected", "completed", "cancelled", "disputed"].includes(
                    selectedRequest.status
                  ))) && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Хаах
                  </Button>
                  {selectedRequest.client_id === user?.id &&
                    ["rejected", "cancelled"].includes(selectedRequest.status) && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setRequestToDelete(selectedRequest.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Устгах
                      </Button>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
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
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
