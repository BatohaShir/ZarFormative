"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { useAuth } from "@/contexts/auth-context";
import {
  ChevronLeft,
  Search,
  Send,
  Inbox,
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  Phone,
  User,
  X,
  Check,
  MoreVertical,
  Trash2,
  Play,
  MessageCircle,
  SendHorizontal,
  ArrowLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Төрөл тодорхойлолт
interface ChatMessage {
  id: number;
  senderId: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
}

interface Request {
  id: number;
  type: "my_request" | "incoming" | "active";
  status: "pending" | "accepted" | "rejected" | "completed";
  service: {
    id: number;
    title: string;
    image: string;
    provider: {
      name: string;
      avatar: string;
      phone: string;
      rating: number;
    };
  };
  client?: {
    name: string;
    avatar: string;
    phone: string;
  };
  description: string;
  requestedDate: string;
  requestedTime: string;
  location: string;
  createdAt: Date;
  price?: string;
  unreadMessages?: number;
  messages?: ChatMessage[];
}

// Mock data
const mockRequests: Request[] = [
  // Миний хүсэлтүүд (би илгээсэн)
  {
    id: 1,
    type: "my_request",
    status: "pending",
    service: {
      id: 101,
      title: "Компьютер засвар",
      image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=400&fit=crop",
      provider: {
        name: "ТехМастер",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        phone: "99112233",
        rating: 4.8,
      },
    },
    description: "Ноутбук удаан ажиллаж байна, цэвэрлэгээ хийлгэх",
    requestedDate: "2025-01-02",
    requestedTime: "14:00",
    location: "Баянзүрх дүүрэг, 3-р хороо",
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    price: "50,000₮",
  },
  {
    id: 2,
    type: "my_request",
    status: "accepted",
    service: {
      id: 102,
      title: "Ачаа тээвэр",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=400&fit=crop",
      provider: {
        name: "Хурд Логистик",
        avatar: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&h=100&fit=crop",
        phone: "88001122",
        rating: 4.5,
      },
    },
    description: "Хөдөө орон нутагруу 500кг ачаа хүргүүлэх",
    requestedDate: "2025-01-03",
    requestedTime: "09:00",
    location: "Дархан хот",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    price: "150,000₮",
  },
  // Ирсэн хүсэлтүүд (надад ирсэн)
  {
    id: 3,
    type: "incoming",
    status: "pending",
    service: {
      id: 201,
      title: "Гэрийн цэвэрлэгээ",
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop",
      provider: {
        name: "Миний компани",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
        phone: "99887766",
        rating: 4.9,
      },
    },
    client: {
      name: "Батбаяр Д.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      phone: "99001122",
    },
    description: "Маргааш 10:00 цагт 100 м² байрыг цэвэрлэх",
    requestedDate: "2025-01-01",
    requestedTime: "10:00",
    location: "Сүхбаатар дүүрэг, 1-р хороо",
    createdAt: new Date(Date.now() - 1000 * 60 * 14),
    price: "80,000₮",
  },
  {
    id: 4,
    type: "incoming",
    status: "pending",
    service: {
      id: 202,
      title: "Орон сууцны засвар",
      image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=400&fit=crop",
      provider: {
        name: "Миний компани",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
        phone: "99887766",
        rating: 4.9,
      },
    },
    client: {
      name: "Оюунаа Б.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      phone: "88112233",
    },
    description: "2 өрөө байрны хана будах, шал солих ажил",
    requestedDate: "2025-01-05",
    requestedTime: "09:00",
    location: "Хан-Уул дүүрэг, 11-р хороо",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    price: "500,000₮",
  },
  // Идэвхтэй захиалгууд (ажилд авсан)
  {
    id: 5,
    type: "active",
    status: "accepted",
    service: {
      id: 301,
      title: "Англи хэлний хичээл",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop",
      provider: {
        name: "Миний компани",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
        phone: "99887766",
        rating: 4.9,
      },
    },
    client: {
      name: "Ганбат Э.",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
      phone: "77889900",
    },
    description: "IELTS-д бэлдэх хичээл, 7 дней",
    requestedDate: "2025-01-10",
    requestedTime: "18:00",
    location: "Онлайн",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    price: "200,000₮",
    unreadMessages: 3,
    messages: [
      { id: 1, senderId: "client", text: "Сайн байна уу! Хичээл хэзээ эхлэх вэ?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), isRead: true },
      { id: 2, senderId: "provider", text: "Сайн байна уу! Маргааш 18:00 цагт эхлэх боломжтой.", timestamp: new Date(Date.now() - 1000 * 60 * 60), isRead: true },
      { id: 3, senderId: "client", text: "За тэгье! Zoom холбоос илгээнэ үү.", timestamp: new Date(Date.now() - 1000 * 60 * 30), isRead: false },
      { id: 4, senderId: "client", text: "Түрүүлж төлбөр төлөх үү?", timestamp: new Date(Date.now() - 1000 * 60 * 20), isRead: false },
      { id: 5, senderId: "client", text: "Хариу өгөөч", timestamp: new Date(Date.now() - 1000 * 60 * 5), isRead: false },
    ],
  },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("mn-MN", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatCreatedAt(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) {
    return `${minutes} минутын өмнө`;
  } else if (hours < 24) {
    return `${hours} цагийн өмнө`;
  } else {
    return `${days} өдрийн өмнө`;
  }
}

function getStatusBadge(status: Request["status"]) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">Хүлээгдэж буй</Badge>;
    case "accepted":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">Зөвшөөрсөн</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">Татгалзсан</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">Дууссан</Badge>;
    default:
      return null;
  }
}

export default function RequestsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [requests, setRequests] = React.useState<Request[]>(mockRequests);
  const [selectedRequest, setSelectedRequest] = React.useState<Request | null>(null);
  const [showChat, setShowChat] = React.useState(false);
  const [chatMessage, setChatMessage] = React.useState("");
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // Filter requests by type
  const myRequests = requests.filter(r => r.type === "my_request");
  const incomingRequests = requests.filter(r => r.type === "incoming");
  const activeRequests = requests.filter(r => r.type === "active" || (r.type === "my_request" && r.status === "accepted"));

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const filterRequests = (reqs: Request[]) => {
    if (!searchQuery) return reqs;
    return reqs.filter(
      (req) =>
        req.service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.service.provider.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleAccept = (requestId: number) => {
    setRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return { ...r, status: "accepted" as const, type: "active" as const };
      }
      return r;
    }));
    setSelectedRequest(null);
  };

  const handleReject = (requestId: number) => {
    setRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return { ...r, status: "rejected" as const };
      }
      return r;
    }));
    setSelectedRequest(null);
  };

  const handleDelete = (requestId: number) => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
    setSelectedRequest(null);
  };

  const handleOpenChat = (request: Request) => {
    // Mark messages as read
    setRequests(prev => prev.map(r => {
      if (r.id === request.id) {
        return {
          ...r,
          unreadMessages: 0,
          messages: r.messages?.map(m => ({ ...m, isRead: true }))
        };
      }
      return r;
    }));
    setSelectedRequest({ ...request, unreadMessages: 0 });
    setShowChat(true);
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !selectedRequest) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      senderId: "provider",
      text: chatMessage.trim(),
      timestamp: new Date(),
      isRead: true
    };

    setRequests(prev => prev.map(r => {
      if (r.id === selectedRequest.id) {
        return {
          ...r,
          messages: [...(r.messages || []), newMessage]
        };
      }
      return r;
    }));

    setSelectedRequest(prev => prev ? {
      ...prev,
      messages: [...(prev.messages || []), newMessage]
    } : null);

    setChatMessage("");
  };

  // Scroll to bottom when chat opens or new message
  React.useEffect(() => {
    if (showChat && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [showChat, selectedRequest?.messages?.length]);

  const formatChatTime = (date: Date) => {
    return date.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
  };

  const renderRequestCard = (request: Request) => (
    <div
      key={request.id}
      className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setSelectedRequest(request)}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <img
          src={request.service.image}
          alt={request.service.title}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm md:text-base truncate">
              {request.service.title}
            </h3>
            {getStatusBadge(request.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatCreatedAt(request.createdAt)}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {request.description}
      </p>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(request.requestedDate)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{request.requestedTime}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{request.location}</span>
        </div>
      </div>

      {/* Client/Provider Info */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div className="flex items-center gap-2">
          <img
            src={request.type === "my_request" ? request.service.provider.avatar : request.client?.avatar}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-medium">
              {request.type === "my_request" ? request.service.provider.name : request.client?.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {request.type === "my_request" ? "Үйлчилгээ үзүүлэгч" : "Захиалагч"}
            </p>
          </div>
        </div>
        {request.price && (
          <span className="text-sm font-semibold text-primary">{request.price}</span>
        )}
      </div>

      {/* Action Buttons for Incoming */}
      {request.type === "incoming" && request.status === "pending" && (
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              handleReject(request.id);
            }}
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
          >
            <Check className="h-4 w-4 mr-1" />
            Хүлээн авах
          </Button>
        </div>
      )}

      {/* Chat Button for Active Requests */}
      {(request.type === "active" || (request.type === "my_request" && request.status === "accepted")) && (
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full relative"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenChat(request);
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Чат
            {(request.unreadMessages ?? 0) > 0 && (
              <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                {request.unreadMessages}
              </span>
            )}
          </Button>
        </div>
      )}
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
              Миний хүсэлт ({myRequests.length})
            </TabsTrigger>
            <TabsTrigger value="incoming" className="flex-1 text-xs md:text-sm">
              <Inbox className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
              Ирсэн ({incomingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1 text-xs md:text-sm">
              <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
              Идэвхтэй ({activeRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* My Requests - миний илгээсэн хүсэлтүүд */}
          <TabsContent value="my_requests">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterRequests(myRequests).length === 0 ? (
                <div className="col-span-full text-center py-8 md:py-12 text-muted-foreground">
                  <Send className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm md:text-base">Илгээсэн хүсэлт байхгүй</p>
                  <p className="text-xs mt-1">Та үйлчилгээнд хүсэлт илгээхэд энд харагдана</p>
                </div>
              ) : (
                filterRequests(myRequests).map(renderRequestCard)
              )}
            </div>
          </TabsContent>

          {/* Incoming Requests - надад ирсэн хүсэлтүүд */}
          <TabsContent value="incoming">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterRequests(incomingRequests).length === 0 ? (
                <div className="col-span-full text-center py-8 md:py-12 text-muted-foreground">
                  <Inbox className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm md:text-base">Ирсэн хүсэлт байхгүй</p>
                  <p className="text-xs mt-1">Таны үйлчилгээнд сонирхсон хүмүүс энд харагдана</p>
                </div>
              ) : (
                filterRequests(incomingRequests).map(renderRequestCard)
              )}
            </div>
          </TabsContent>

          {/* Active - идэвхтэй захиалгууд */}
          <TabsContent value="active">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterRequests(activeRequests).length === 0 ? (
                <div className="col-span-full text-center py-8 md:py-12 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm md:text-base">Идэвхтэй захиалга байхгүй</p>
                  <p className="text-xs mt-1">Хүлээн авсан захиалгууд энд харагдана</p>
                </div>
              ) : (
                filterRequests(activeRequests).map(renderRequestCard)
              )}
            </div>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedRequest(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Service Info */}
              <div className="flex gap-4">
                <img
                  src={selectedRequest.service.image}
                  alt={selectedRequest.service.title}
                  className="w-24 h-24 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-lg">{selectedRequest.service.title}</h4>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  {selectedRequest.price && (
                    <p className="text-xl font-bold text-primary mt-1">{selectedRequest.price}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-1">Тайлбар</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Огноо</span>
                  </div>
                  <p className="text-sm font-medium">{formatDate(selectedRequest.requestedDate)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Цаг</span>
                  </div>
                  <p className="text-sm font-medium">{selectedRequest.requestedTime}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">Байршил</span>
                  </div>
                  <p className="text-sm font-medium">{selectedRequest.location}</p>
                </div>
              </div>

              {/* Person Info */}
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">
                  {selectedRequest.type === "my_request" ? "Үйлчилгээ үзүүлэгч" : "Захиалагч"}
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={selectedRequest.type === "my_request" ? selectedRequest.service.provider.avatar : selectedRequest.client?.avatar}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">
                      {selectedRequest.type === "my_request" ? selectedRequest.service.provider.name : selectedRequest.client?.name}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>
                        {selectedRequest.type === "my_request" ? selectedRequest.service.provider.phone : selectedRequest.client?.phone}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Created At */}
              <p className="text-xs text-muted-foreground text-center">
                Үүсгэсэн: {formatCreatedAt(selectedRequest.createdAt)}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-background border-t p-4">
              {selectedRequest.type === "incoming" && selectedRequest.status === "pending" ? (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleReject(selectedRequest.id)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Татгалзах
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleAccept(selectedRequest.id)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Хүлээн авах
                  </Button>
                </div>
              ) : (selectedRequest.type === "active" || (selectedRequest.type === "my_request" && selectedRequest.status === "accepted")) ? (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Хаах
                  </Button>
                  <Button
                    className="flex-1 relative"
                    onClick={() => handleOpenChat(selectedRequest)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Чат
                    {(selectedRequest.unreadMessages ?? 0) > 0 && (
                      <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                        {selectedRequest.unreadMessages}
                      </span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Хаах
                  </Button>
                  {selectedRequest.status === "pending" && (
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(selectedRequest.id)}
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

      {/* Chat Modal */}
      {showChat && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:max-w-lg md:rounded-xl rounded-t-xl h-[85vh] md:h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChat(false)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img
                src={selectedRequest.type === "my_request" ? selectedRequest.service.provider.avatar : selectedRequest.client?.avatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {selectedRequest.type === "my_request" ? selectedRequest.service.provider.name : selectedRequest.client?.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedRequest.service.title}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => {
                  const phone = selectedRequest.type === "my_request"
                    ? selectedRequest.service.provider.phone
                    : selectedRequest.client?.phone;
                  if (phone) window.location.href = `tel:${phone}`;
                }}
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChat(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Chat Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
            >
              {selectedRequest.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === "provider" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.senderId === "provider"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.senderId === "provider" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {formatChatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {(!selectedRequest.messages || selectedRequest.messages.length === 0) && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">Мессеж байхгүй</p>
                  <p className="text-xs">Эхлээд мессеж илгээнэ үү</p>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Мессеж бичих..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim()}
                >
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
