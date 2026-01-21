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
  ImageIcon,
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
import { CACHE_TIMES } from "@/lib/react-query-config";
import { AddressMap } from "@/components/address-map";
import { ActiveRequestsSidebar } from "@/components/active-requests-sidebar";
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
  image_url: string | null;
  preferred_date: Date | null;
  preferred_time: string | null;
  created_at: Date;
  updated_at: Date;
  accepted_at: Date | null;
  completed_at: Date | null;
  // Адрес оказания услуги
  aimag_id: string | null;
  district_id: string | null;
  khoroo_id: string | null;
  address_detail: string | null;
  aimag: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  khoroo: { id: string; name: string } | null;
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

// type: "sent" = я отправил заявку (я клиент), "received" = мне пришла заявка (я исполнитель)
function getStatusBadge(status: RequestStatus, type: "sent" | "received" = "sent") {
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
    case "cancelled_by_client":
      // Если я в табе "Илгээсэн" (sent) - я отменил = "Цуцлагдсан"
      // Если я в табе "Ирсэн" (received) - клиент отменил = "Захиалагч цуцалсан"
      return (
        <Badge
          variant="outline"
          className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800"
        >
          <X className="h-3 w-3 mr-1" />
          {type === "sent" ? "Цуцлагдсан" : "Захиалагч цуцалсан"}
        </Badge>
      );
    case "cancelled_by_provider":
      // Если я в табе "Илгээсэн" (sent) - исполнитель отменил = "Гүйцэтгэгч цуцалсан"
      // Если я в табе "Ирсэн" (received) - я отменил = "Цуцлагдсан"
      return (
        <Badge
          variant="outline"
          className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800"
        >
          <X className="h-3 w-3 mr-1" />
          {type === "received" ? "Цуцлагдсан" : "Гүйцэтгэгч цуцалсан"}
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

function formatPreferredDateTime(date: Date | null, time: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  const dateStr = d.toLocaleDateString("mn-MN", {
    month: "short",
    day: "numeric",
  });
  if (time) {
    return `${dateStr}, ${time}`;
  }
  return dateStr;
}

// Кнопка "Ажилд" для мобильного header
function MobileActiveRequestsButton({ count }: { count: number }) {
  if (count === 0) return null;

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("open-active-requests-sidebar"));
  };

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
}

export default function RequestsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRequest, setSelectedRequest] = React.useState<RequestWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [requestToDelete, setRequestToDelete] = React.useState<string | null>(null);

  // ОПТИМИЗАЦИЯ: Один запрос вместо двух с OR условием
  // Это уменьшает количество round-trips к БД на 50%
  const {
    data: allRequests,
    isLoading: requestsLoading,
    refetch: refetchRequests,
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
        // Адрес оказания услуги
        aimag: {
          select: { id: true, name: true },
        },
        district: {
          select: { id: true, name: true },
        },
        khoroo: {
          select: { id: true, name: true },
        },
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

  // Алиасы для обратной совместимости с refetch
  const refetchMyRequests = refetchRequests;
  const refetchIncoming = refetchRequests;

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

  // Данные уже типизированы из useMemo выше
  const myRequestsList = myRequests;
  const incomingRequestsList = incomingRequests;

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

  // Клиент отменяет свою заявку
  const handleCancelByClient = async (requestId: string) => {
    try {
      await updateRequest.mutateAsync({
        where: { id: requestId },
        data: { status: "cancelled_by_client" },
      });
      toast.success("Хүсэлт цуцлагдлаа");
      refetchMyRequests();
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Алдаа гарлаа");
    }
  };

  // Исполнитель отменяет заявку
  const handleCancelByProvider = async (requestId: string) => {
    try {
      await updateRequest.mutateAsync({
        where: { id: requestId },
        data: { status: "cancelled_by_provider" },
      });
      toast.success("Хүсэлт цуцлагдлаа");
      refetchIncoming();
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

  const isLoading = requestsLoading;

  const renderRequestListItem = (request: RequestWithRelations, type: "sent" | "received") => {
    const isMyRequest = type === "sent";
    const otherPerson = isMyRequest ? request.provider : request.client;
    const preferredDateTime = formatPreferredDateTime(request.preferred_date, request.preferred_time);

    return (
      <div
        key={request.id}
        className="group bg-card border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer"
        onClick={() => setSelectedRequest(request)}
      >
        <div className="flex gap-3 p-3">
          {/* Image */}
          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden shrink-0">
            <Image
              src={getListingImage(request.listing)}
              alt={request.listing.title}
              fill
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title & Status */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm line-clamp-1">
                {request.listing.title}
              </h3>
              <div className="shrink-0">
                {getStatusBadge(request.status, type)}
              </div>
            </div>

            {/* Person */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="relative w-5 h-5 rounded-full overflow-hidden bg-muted shrink-0">
                {otherPerson.avatar_url ? (
                  <Image
                    src={otherPerson.avatar_url}
                    alt=""
                    fill
                    unoptimized={otherPerson.avatar_url.includes("dicebear")}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {getPersonName(otherPerson)}
              </span>
            </div>

            {/* Date/Time & Message in one row */}
            <div className="flex items-center gap-3 text-xs">
              {preferredDateTime && (
                <span className="flex items-center gap-1 text-primary font-medium shrink-0">
                  <Calendar className="h-3 w-3" />
                  {preferredDateTime}
                </span>
              )}
              <span className="text-muted-foreground line-clamp-1 italic">
                &ldquo;{request.message}&rdquo;
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons for incoming pending */}
        {!isMyRequest && request.status === "pending" && (
          <div className="flex gap-2 px-3 pb-3 pt-0">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
              onClick={(e) => {
                e.stopPropagation();
                handleReject(request.id);
              }}
              disabled={updateRequest.isPending}
            >
              <X className="h-3 w-3 mr-1" />
              Татгалзах
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
              onClick={(e) => {
                e.stopPropagation();
                handleAccept(request.id);
              }}
              disabled={updateRequest.isPending}
            >
              <Check className="h-3 w-3 mr-1" />
              Хүлээн авах
            </Button>
          </div>
        )}

        {/* Cancel button for sent pending requests (client cancels) */}
        {isMyRequest && request.status === "pending" && (
          <div className="px-3 pb-3 pt-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
              onClick={(e) => {
                e.stopPropagation();
                handleCancelByClient(request.id);
              }}
              disabled={updateRequest.isPending}
            >
              <X className="h-3 w-3 mr-1" />
              Цуцлах
            </Button>
          </div>
        )}

        {/* Cancel button for received accepted requests (provider cancels) */}
        {!isMyRequest && request.status === "accepted" && (
          <div className="px-3 pb-3 pt-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
              onClick={(e) => {
                e.stopPropagation();
                handleCancelByProvider(request.id);
              }}
              disabled={updateRequest.isPending}
            >
              <X className="h-3 w-3 mr-1" />
              Цуцлах
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderEmptyState = (icon: React.ReactNode, title: string, description: string) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <div className="text-muted-foreground/50">{icon}</div>
      </div>
      <p className="text-base font-medium text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground text-center max-w-xs">{description}</p>
    </div>
  );

  const renderLoadingState = () => (
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
          <MobileActiveRequestsButton
            count={incomingRequestsList.filter(r => r.status === "accepted" || r.status === "in_progress").length}
          />
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
                {myRequestsList.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold min-w-5 text-center">
                    {myRequestsList.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="incoming"
                className="rounded-full px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium"
              >
                <Inbox className="h-4 w-4 mr-2" />
                Ирсэн
                {incomingRequestsList.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold min-w-5 text-center">
                    {incomingRequestsList.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* My Requests - миний илгээсэн хүсэлтүүд */}
          <TabsContent value="my_requests" className="mt-0">
            {isLoading ? (
              renderLoadingState()
            ) : filterRequests(myRequestsList).length === 0 ? (
              renderEmptyState(
                <Send className="h-12 w-12" />,
                "Илгээсэн хүсэлт байхгүй",
                "Та үйлчилгээнд хүсэлт илгээхэд энд харагдана"
              )
            ) : (
              <div className="space-y-3">
                {filterRequests(myRequestsList).map((r) => renderRequestListItem(r, "sent"))}
              </div>
            )}
          </TabsContent>

          {/* Incoming Requests - надад ирсэн хүсэлтүүд */}
          <TabsContent value="incoming" className="mt-0">
            {isLoading ? (
              renderLoadingState()
            ) : filterRequests(incomingRequestsList).length === 0 ? (
              renderEmptyState(
                <Inbox className="h-12 w-12" />,
                "Ирсэн хүсэлт байхгүй",
                "Таны үйлчилгээнд сонирхсон хүмүүс энд харагдана"
              )
            ) : (
              <div className="space-y-3">
                {filterRequests(incomingRequestsList).map((r) => renderRequestListItem(r, "received"))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Active Requests Sidebar - показывает заявки в работе */}
      <ActiveRequestsSidebar
        requests={incomingRequestsList}
        onSelectRequest={(request) => setSelectedRequest(request as RequestWithRelations)}
      />

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:max-w-2xl md:rounded-xl rounded-t-xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-background border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Хүсэлтийн дэлгэрэнгүй</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Service Info */}
              <div className="flex gap-4">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
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
                  <div className="mt-2">
                    {getStatusBadge(
                      selectedRequest.status,
                      selectedRequest.client_id === user?.id ? "sent" : "received"
                    )}
                  </div>
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

              {/* Client Image - показываем только для incoming заявок (исполнитель смотрит) */}
              {selectedRequest.image_url && selectedRequest.provider_id === user?.id && (
                <div className="border rounded-lg overflow-hidden">
                  <p className="text-sm font-medium p-3 border-b bg-muted/30 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Зураг
                  </p>
                  <div className="relative w-full aspect-video">
                    <Image
                      src={selectedRequest.image_url}
                      alt="Хүсэлтийн зураг"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}

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
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
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
                        unoptimized={
                          (selectedRequest.client_id === user?.id
                            ? selectedRequest.provider
                            : selectedRequest.client
                          ).avatar_url?.includes("dicebear") ?? false
                        }
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

              {/* Address Info - only show for incoming requests (I'm provider) */}
              {selectedRequest.provider_id === user?.id && selectedRequest.aimag && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Үйлчилгээ үзүүлэх хаяг
                    </p>
                    <p className="text-sm font-medium">
                      {[
                        selectedRequest.aimag?.name,
                        selectedRequest.district?.name,
                        selectedRequest.khoroo?.name,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {/* Детальный адрес */}
                    {selectedRequest.address_detail && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedRequest.address_detail}
                      </p>
                    )}
                  </div>
                  {/* Map with circle marker */}
                  <AddressMap
                    aimagName={selectedRequest.aimag?.name}
                    districtName={selectedRequest.district?.name}
                    khorooName={selectedRequest.khoroo?.name}
                  />
                </div>
              )}
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

              {/* Actions for ACCEPTED requests (provider can start work or cancel) */}
              {selectedRequest.provider_id === user?.id && selectedRequest.status === "accepted" && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleCancelByProvider(selectedRequest.id)}
                    disabled={updateRequest.isPending}
                  >
                    {updateRequest.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Цуцлах
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
                    onClick={() => handleCancelByClient(selectedRequest.id)}
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
                  ["rejected", "completed", "cancelled_by_client", "cancelled_by_provider", "disputed"].includes(
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
                    ["rejected", "cancelled_by_client", "cancelled_by_provider"].includes(selectedRequest.status) && (
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
