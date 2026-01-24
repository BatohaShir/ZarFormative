"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  X,
  Send,
  Loader2,
  MessageCircle,
  Paperclip,
  ImageIcon,
  MapPin,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  useFindManychat_messages,
  useCreatechat_messages,
  useUpdateManychat_messages,
  useCreatenotifications,
} from "@/lib/hooks";
import type { RequestWithRelations, PersonInfo } from "./types";
import { formatCreatedAt, getPersonName, getPersonInitials } from "./utils";
import {
  uploadChatAttachment,
  validateImageFile,
} from "@/lib/storage/chat-attachments";

// Цвета для аватарок на основе имени
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-teal-500",
];

function getAvatarColor(person: PersonInfo): string {
  const charSum =
    (person.first_name?.charCodeAt(0) || 0) +
    (person.last_name?.charCodeAt(0) || 0) +
    (person.company_name?.charCodeAt(0) || 0);
  return AVATAR_COLORS[charSum % AVATAR_COLORS.length];
}

// Компонент аватарки с инициалами
function ChatAvatar({
  person,
  size = "md",
  className = "",
}: {
  person: PersonInfo;
  size?: "sm" | "md";
  className?: string;
}) {
  const sizeClasses = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const initials = getPersonInitials(person);
  const bgColor = getAvatarColor(person);

  if (person.avatar_url) {
    return (
      <div
        className={cn(
          "relative rounded-full overflow-hidden shrink-0",
          sizeClasses,
          className
        )}
      >
        <Image
          src={person.avatar_url}
          alt=""
          fill
          unoptimized={person.avatar_url.includes("dicebear")}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center font-semibold text-white",
        sizeClasses,
        bgColor,
        className
      )}
    >
      {initials}
    </div>
  );
}

// Типы для вложений
interface AttachmentPreview {
  type: "image" | "location";
  file?: File;
  previewUrl?: string;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
}

interface RequestChatProps {
  request: RequestWithRelations;
  onClose: () => void;
}

export function RequestChat({ request, onClose }: RequestChatProps) {
  const { user } = useAuth();
  const [message, setMessage] = React.useState("");
  const [attachment, setAttachment] = React.useState<AttachmentPreview | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [locationLoading, setLocationLoading] = React.useState(false);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isClient = request.client_id === user?.id;
  const otherPerson: PersonInfo = isClient ? request.provider : request.client;

  // Fetch messages (без polling - используем Realtime)
  const { data: messages, refetch, isLoading: isLoadingMessages } = useFindManychat_messages(
    {
      where: { request_id: request.id },
      orderBy: { created_at: "asc" },
      include: {
        sender: {
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
    },
    {
      enabled: !!request.id,
      // Убрали refetchInterval - используем Realtime
    }
  );

  // Create message mutation
  const createMessage = useCreatechat_messages();

  // Mark messages as read
  const markAsRead = useUpdateManychat_messages();

  // Create notification mutation
  const createNotification = useCreatenotifications();

  // Get the other person's ID (who should receive notification)
  const otherPersonId = isClient ? request.provider_id : request.client_id;

  // Track which messages we've already marked as read to prevent duplicate calls
  const markedAsReadRef = React.useRef<Set<string>>(new Set());

  // Supabase Realtime subscription
  React.useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat:${request.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `request_id=eq.${request.id}`,
        },
        () => {
          // Refetch messages when new message arrives
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [request.id, refetch]);

  // Mark unread messages as read when opening chat
  React.useEffect(() => {
    if (!user?.id || !messages || markAsRead.isPending) return;

    const messagesList = messages as { id: string; sender_id: string; is_read: boolean }[];
    const unreadMessages = messagesList?.filter(
      (m) => m.sender_id !== user.id && !m.is_read && !markedAsReadRef.current.has(m.id)
    );

    if (unreadMessages && unreadMessages.length > 0) {
      // Mark these messages as being processed
      unreadMessages.forEach((m) => markedAsReadRef.current.add(m.id));

      markAsRead.mutate({
        where: {
          request_id: request.id,
          sender_id: { not: user.id },
          is_read: false,
        },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, messages, request.id]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, [attachment?.previewUrl]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      alert(error);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAttachment({
      type: "image",
      file,
      previewUrl,
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle location request
  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      alert("Таны браузер байршил тодорхойлохыг дэмждэггүй");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Try to get location name using reverse geocoding
        let locationName: string | undefined;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          locationName = data.display_name?.split(",").slice(0, 3).join(", ");
        } catch {
          // Ignore geocoding errors
        }

        setAttachment({
          type: "location",
          location: {
            lat: latitude,
            lng: longitude,
            name: locationName,
          },
        });
        setLocationLoading(false);
      },
      () => {
        alert("Байршил тодорхойлоход алдаа гарлаа. Зөвшөөрөл өгсөн эсэхийг шалгана уу.");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Clear attachment
  const clearAttachment = () => {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachment(null);
  };

  const handleSend = async () => {
    if ((!message.trim() && !attachment) || !user?.id) return;

    try {
      setIsUploading(true);

      let attachmentType: string | undefined;
      let attachmentUrl: string | undefined;
      let locationLat: number | undefined;
      let locationLng: number | undefined;
      let locationName: string | undefined;

      // Handle image upload
      if (attachment?.type === "image" && attachment.file) {
        const result = await uploadChatAttachment(
          request.id,
          user.id,
          attachment.file
        );

        if (result.error) {
          alert(result.error);
          setIsUploading(false);
          return;
        }

        attachmentType = "image";
        attachmentUrl = result.publicUrl || undefined;
      }

      // Handle location
      if (attachment?.type === "location" && attachment.location) {
        attachmentType = "location";
        locationLat = attachment.location.lat;
        locationLng = attachment.location.lng;
        locationName = attachment.location.name;
      }

      await createMessage.mutateAsync({
        data: {
          request_id: request.id,
          sender_id: user.id,
          message: message.trim() || (attachmentType === "image" ? "📷 Зураг" : "📍 Байршил"),
          attachment_type: attachmentType,
          attachment_url: attachmentUrl,
          location_lat: locationLat,
          location_lng: locationLng,
          location_name: locationName,
        },
      });

      // Send notification to the other person (non-blocking)
      try {
        const senderName = isClient ? getPersonName(request.client) : getPersonName(request.provider);
        const notificationMessage = attachmentType === "image"
          ? `${senderName}: [Зураг] илгээсэн`
          : attachmentType === "location"
          ? `${senderName}: [Байршил] илгээсэн`
          : `${senderName}: ${message.trim().slice(0, 50)}${message.trim().length > 50 ? "..." : ""}`;

        const notificationData = {
          user_id: otherPersonId,
          type: "new_message" as const,
          title: "Шинэ мессеж",
          message: notificationMessage,
          request_id: request.id,
          actor_id: user.id,
        };

        createNotification.mutate({
          data: notificationData,
        });
      } catch {
        // Notification failed but message was sent - don't block
      }

      setMessage("");
      clearAttachment();
      refetch();
    } catch {
      // Message sending failed - user will see the message wasn't sent
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center">
      <div className="bg-background w-full md:max-w-lg md:rounded-2xl rounded-t-2xl h-[80vh] md:h-[600px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b px-4 py-3 flex items-center gap-3 bg-muted/30 md:rounded-t-2xl">
          <ChatAvatar person={otherPerson} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{getPersonName(otherPerson)}</p>
            <p className="text-xs text-muted-foreground truncate">
              {request.listing.title}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 px-4 py-3 overflow-y-auto bg-muted/10" ref={scrollRef}>
          {isLoadingMessages ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                Чат ачааллаж байна...
              </p>
            </div>
          ) : !messages || (messages as unknown[]).length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                Чат эхлээгүй байна
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Мессеж илгээж чатыг эхлүүлээрэй
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(messages as {
                id: string;
                message: string;
                sender_id: string;
                created_at: string | Date;
                sender: PersonInfo;
                attachment_type?: string | null;
                attachment_url?: string | null;
                location_lat?: number | null;
                location_lng?: number | null;
                location_name?: string | null;
              }[]).map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2 items-end",
                      isMe ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {!isMe && msg.sender && (
                      <ChatAvatar person={msg.sender} size="sm" className="mb-5" />
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-background border rounded-bl-sm"
                      )}
                    >
                      {/* Image attachment */}
                      {msg.attachment_type === "image" && msg.attachment_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(msg.attachment_url!)}
                          className="block mb-2 cursor-zoom-in"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.attachment_url}
                            alt="Хавсралт зураг"
                            className="rounded-lg object-cover max-w-50 max-h-37.5"
                            onError={(e) => {
                              // Hide broken image
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </button>
                      )}

                      {/* Location attachment */}
                      {msg.attachment_type === "location" && msg.location_lat && msg.location_lng && (
                        <a
                          href={`https://www.google.com/maps?q=${msg.location_lat},${msg.location_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg mb-2 transition-colors",
                            isMe
                              ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          <MapPin className="h-5 w-5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium">Байршил</p>
                            {msg.location_name && (
                              <p className="text-xs truncate opacity-70">
                                {msg.location_name}
                              </p>
                            )}
                          </div>
                        </a>
                      )}

                      {/* Text message (hide if only attachment placeholder) */}
                      {msg.message && !(msg.attachment_type && (msg.message === "📷 Зураг" || msg.message === "📍 Байршил")) && (
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.message}
                        </p>
                      )}

                      <p
                        className={cn(
                          "text-[10px] mt-1 text-right",
                          isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {formatCreatedAt(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Attachment preview */}
        {attachment && (
          <div className="shrink-0 px-3 pt-2 border-t bg-muted/30">
            <div className="relative inline-block">
              {attachment.type === "image" && attachment.previewUrl && (
                <Image
                  src={attachment.previewUrl}
                  alt="Preview"
                  width={80}
                  height={60}
                  className="rounded-lg object-cover"
                />
              )}
              {attachment.type === "location" && attachment.location && (
                <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    {attachment.location.name || `${attachment.location.lat.toFixed(4)}, ${attachment.location.lng.toFixed(4)}`}
                  </span>
                </div>
              )}
              <button
                onClick={clearAttachment}
                className="absolute -top-2 -right-2 p-0.5 bg-destructive text-destructive-foreground rounded-full"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t p-3 bg-background">
          <div className="flex gap-2 items-center">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Paperclip button */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full shrink-0"
                  disabled={isUploading || locationLoading}
                >
                  {locationLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 z-100">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Зураг оруулах
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLocationRequest}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Байршил илгээх
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Мессеж бичих..."
              className="flex-1 h-11 rounded-full px-4 bg-muted/50 border-0 focus-visible:ring-1"
              disabled={createMessage.isPending || isUploading}
            />
            <Button
              onClick={handleSend}
              disabled={(!message.trim() && !attachment) || createMessage.isPending || isUploading}
              size="icon"
              className="h-11 w-11 rounded-full shrink-0"
            >
              {createMessage.isPending || isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-70 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt="Зураг"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
