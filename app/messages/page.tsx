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
import { useMessages } from "@/contexts/messages-context";
import { ChevronLeft, Search, Archive, Trash2, MoreVertical, ArchiveRestore, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Conversation {
  id: number;
  type: "incoming" | "outgoing";
  person: {
    name: string;
    avatar: string;
  };
  service: {
    title: string;
    image: string;
  };
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
  requestExpiresAt?: number;
}

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

function formatTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "00:00";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  }
  return `${minutes} мин`;
}

export default function MessagesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    conversations,
    archivedConversations,
    markAsRead,
    archiveConversation,
    unarchiveConversation,
    deleteConversation,
    acceptRequest,
    declineRequest,
    isAccepted,
  } = useMessages();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedConversation, setSelectedConversation] = React.useState<Conversation | null>(null);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [, setTick] = React.useState(0);

  // Update timer every minute
  React.useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleArchiveChat = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    archiveConversation(conversationId);
  };

  const handleUnarchiveChat = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    unarchiveConversation(conversationId);
  };

  const handleDeleteChat = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    deleteConversation(conversationId);
  };

  const handleOpenChat = (conversation: Conversation) => {
    // Mark conversation as read
    if (conversation.unreadCount > 0) {
      markAsRead(conversation.id);
    }
    setSelectedConversation({ ...conversation, unreadCount: 0 });
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
      conv.person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.service.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArchivedConversations = archivedConversations.filter(
    (conv) =>
      conv.person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.service.title.toLowerCase().includes(searchQuery.toLowerCase())
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
            <MessagesButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
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
                      className="flex-1 flex items-center gap-3 md:gap-4 p-2 md:p-3 text-left"
                    >
                      {/* Service Image with Avatar overlay */}
                      <div className="relative shrink-0">
                        <img
                          src={conversation.service.image}
                          alt={conversation.service.title}
                          className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover"
                        />
                        {/* Avatar in top-left corner */}
                        <div className="absolute -top-1.5 -left-1.5">
                          <img
                            src={conversation.person.avatar}
                            alt={conversation.person.name}
                            className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border-2 border-background"
                          />
                          {conversation.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-[1.5px] border-background" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm md:text-base truncate block max-w-40 sm:max-w-55 md:max-w-none">
                          {conversation.person.name}
                        </span>
                        <p className="text-xs text-muted-foreground truncate max-w-50 sm:max-w-70 md:max-w-none">
                          {conversation.service.title}
                        </p>
                        <p className={`text-sm truncate max-w-50 sm:max-w-70 md:max-w-none mt-0.5 ${conversation.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          {conversation.lastMessage}
                        </p>
                      </div>
                    </button>

                    {/* Unread + Timer + Time - centered vertically */}
                    <div className="flex items-center gap-2 shrink-0">
                      {conversation.unreadCount > 0 && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                      {conversation.requestExpiresAt && conversation.requestExpiresAt > Date.now() && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded">
                          <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-mono font-medium text-amber-700 dark:text-amber-300">
                            {formatTimeRemaining(conversation.requestExpiresAt)}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(conversation.lastMessageTime)}
                      </span>
                    </div>

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
                          onClick={(e) => handleArchiveChat(e as unknown as React.MouseEvent, conversation.id)}
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
                      className="flex-1 flex items-center gap-3 md:gap-4 p-2 md:p-3 text-left opacity-60"
                    >
                      {/* Service Image with Avatar overlay */}
                      <div className="relative shrink-0">
                        <img
                          src={conversation.service.image}
                          alt={conversation.service.title}
                          className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover grayscale"
                        />
                        {/* Avatar in top-left corner */}
                        <div className="absolute -top-1.5 -left-1.5">
                          <img
                            src={conversation.person.avatar}
                            alt={conversation.person.name}
                            className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border-2 border-background grayscale"
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm md:text-base truncate max-w-40 sm:max-w-55 md:max-w-none">
                            {conversation.person.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatMessageTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-50 sm:max-w-70 md:max-w-none">
                          {conversation.service.title}
                        </p>
                        <p className="text-sm truncate max-w-50 sm:max-w-70 md:max-w-none mt-0.5 text-muted-foreground">
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
                          onClick={(e) => handleUnarchiveChat(e as unknown as React.MouseEvent, conversation.id)}
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
          provider={selectedConversation.person}
          serviceTitle={selectedConversation.service.title}
          conversationType={selectedConversation.type}
          initialMessage={selectedConversation.lastMessage}
          initialMessageTime={selectedConversation.lastMessageTime}
          requestExpiresAt={selectedConversation.requestExpiresAt}
          isAccepted={isAccepted(selectedConversation.id)}
          onAccept={() => acceptRequest(selectedConversation.id)}
          onDecline={() => declineRequest(selectedConversation.id)}
        />
      )}
    </div>
  );
}
