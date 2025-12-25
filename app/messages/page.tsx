"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { MessagesButton } from "@/components/messages-button";
import { ChatModal } from "@/components/chat-modal";
import { useAuth } from "@/contexts/auth-context";
import { ChevronLeft, Search, Archive, Trash2, MoreVertical, ArchiveRestore } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Conversation {
  id: number;
  provider: {
    name: string;
    avatar: string;
  };
  serviceTitle: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
}

// Mock conversations data
const mockConversations: Conversation[] = [
  {
    id: 1,
    provider: {
      name: "Болд Констракшн",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    },
    serviceTitle: "Орон сууцны засвар",
    lastMessage: "Баярлалаа! Таны хүсэлтийг хүлээн авлаа. Удахгүй холбогдох болно.",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: 2,
    provider: {
      name: "Цэвэр Гэр ХХК",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
    serviceTitle: "Гэрийн цэвэрлэгээ",
    lastMessage: "Сайн байна уу! Маргааш 10 цагт ирж болох уу?",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: 3,
    provider: {
      name: "ТехМастер",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    serviceTitle: "Компьютер засвар",
    lastMessage: "Таны компьютер засвар дууссан байна. Ирж авч болно.",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: 4,
    provider: {
      name: "Сараа багш",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    serviceTitle: "Англи хэлний хичээл",
    lastMessage: "Дараагийн хичээл Лхагва гарагт болно.",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: 5,
    provider: {
      name: "Хурд Логистик",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
    },
    serviceTitle: "Ачаа тээвэр",
    lastMessage: "Таны ачааг амжилттай хүргэлээ. Баярлалаа!",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
    unreadCount: 0,
    isOnline: true,
  },
];

function formatMessageTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) {
    return `${minutes} мин`;
  } else if (hours < 24) {
    return `${hours} цаг`;
  } else if (days < 7) {
    return `${days} өдөр`;
  } else {
    return date.toLocaleDateString("mn-MN", { month: "short", day: "numeric" });
  }
}

export default function MessagesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [conversations, setConversations] = React.useState<Conversation[]>(mockConversations);
  const [archivedConversations, setArchivedConversations] = React.useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = React.useState<Conversation | null>(null);
  const [chatOpen, setChatOpen] = React.useState(false);

  const handleArchiveChat = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
    setArchivedConversations((prev) => [...prev, conversation]);
  };

  const handleUnarchiveChat = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    setArchivedConversations((prev) => prev.filter((c) => c.id !== conversation.id));
    setConversations((prev) => [...prev, conversation]);
  };

  const handleDeleteChat = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setArchivedConversations((prev) => prev.filter((c) => c.id !== conversationId));
  };

  const handleOpenChat = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setChatOpen(true);
  };

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArchivedConversations = archivedConversations.filter(
    (conv) =>
      conv.provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
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
            <MessagesButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
          {/* Mobile Nav */}
          <div className="flex items-center gap-2 md:hidden">
            <MessagesButton className="h-9 w-9" />
            <FavoritesButton className="h-9 w-9" />
            <ThemeToggle />
            <AuthModal />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Мессежүүд</h2>

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
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full mb-4 h-10">
            <TabsTrigger value="all" className="flex-1 text-xs md:text-sm">
              Бүгд ({conversations.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex-1 text-xs md:text-sm">
              <Archive className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
              Архив ({archivedConversations.length})
            </TabsTrigger>
          </TabsList>

          {/* All Conversations */}
          <TabsContent value="all">
            <div className="space-y-1">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8 md:py-12 text-muted-foreground">
                  <p className="text-sm md:text-base">Мессеж олдсонгүй</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="group flex items-center gap-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <button
                      onClick={() => handleOpenChat(conversation)}
                      className="flex-1 flex items-center gap-2 md:gap-3 p-2 md:p-3 text-left"
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={conversation.provider.avatar}
                          alt={conversation.provider.name}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                        />
                        {conversation.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs md:text-sm truncate max-w-[140px] sm:max-w-[200px] md:max-w-none">
                            {conversation.provider.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatMessageTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-[250px] md:max-w-none mb-0.5">
                          {conversation.serviceTitle}
                        </p>
                        <p className={`text-xs md:text-sm truncate max-w-[180px] sm:max-w-[250px] md:max-w-none ${conversation.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          {conversation.lastMessage}
                        </p>
                      </div>

                      {/* Unread Indicator */}
                      {conversation.unreadCount > 0 && (
                        <div className="shrink-0 w-2.5 h-2.5 bg-primary rounded-full" />
                      )}
                    </button>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 md:opacity-0 md:group-hover:opacity-100 transition-opacity mr-2"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleArchiveChat(e as unknown as React.MouseEvent, conversation)}
                          className="gap-2 cursor-pointer"
                        >
                          <Archive className="h-4 w-4" />
                          Архивлах
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteChat(e as unknown as React.MouseEvent, conversation.id)}
                          className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                          Устгах
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Archived Conversations */}
          <TabsContent value="archived">
            <div className="space-y-1">
              {filteredArchivedConversations.length === 0 ? (
                <div className="text-center py-8 md:py-12 text-muted-foreground">
                  <Archive className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm md:text-base">Архивлагдсан мессеж байхгүй</p>
                </div>
              ) : (
                filteredArchivedConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="group flex items-center gap-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <button
                      onClick={() => handleOpenChat(conversation)}
                      className="flex-1 flex items-center gap-2 md:gap-3 p-2 md:p-3 text-left opacity-70"
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={conversation.provider.avatar}
                          alt={conversation.provider.name}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover grayscale"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs md:text-sm truncate max-w-[140px] sm:max-w-[200px] md:max-w-none">
                            {conversation.provider.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatMessageTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-[250px] md:max-w-none mb-0.5">
                          {conversation.serviceTitle}
                        </p>
                        <p className="text-xs md:text-sm truncate max-w-[180px] sm:max-w-[250px] md:max-w-none text-muted-foreground">
                          {conversation.lastMessage}
                        </p>
                      </div>
                    </button>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 md:opacity-0 md:group-hover:opacity-100 transition-opacity mr-2"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleUnarchiveChat(e as unknown as React.MouseEvent, conversation)}
                          className="gap-2 cursor-pointer"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                          Архиваас гаргах
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteChat(e as unknown as React.MouseEvent, conversation.id)}
                          className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                          Устгах
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Chat Modal */}
      {selectedConversation && (
        <ChatModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          provider={selectedConversation.provider}
          serviceTitle={selectedConversation.serviceTitle}
        />
      )}
    </div>
  );
}
