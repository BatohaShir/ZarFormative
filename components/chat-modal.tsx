"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, ArrowLeft, Phone, Trash2, Paperclip, MapPin, Image, Video, Check, X, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: number;
  text: string;
  sender: "user" | "provider";
  timestamp: Date;
}

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: {
    name: string;
    avatar: string;
  };
  serviceTitle: string;
  conversationType?: "incoming" | "outgoing";
  initialMessage?: string;
  initialMessageTime?: Date;
  requestExpiresAt?: number;
  onAccept?: () => void;
  onDecline?: () => void;
  isAccepted?: boolean;
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

export function ChatModal({
  open,
  onOpenChange,
  provider,
  serviceTitle,
  conversationType = "outgoing",
  initialMessage,
  initialMessageTime,
  requestExpiresAt,
  onAccept,
  onDecline,
  isAccepted = false,
}: ChatModalProps) {
  const [timeRemaining, setTimeRemaining] = React.useState<string | null>(null);
  const isPendingRequest = conversationType === "incoming" && requestExpiresAt && requestExpiresAt > Date.now() && !isAccepted;

  // Timer update for pending requests
  React.useEffect(() => {
    if (!isPendingRequest || !requestExpiresAt) return;

    const updateTimer = () => {
      const remaining = requestExpiresAt - Date.now();
      if (remaining <= 0) {
        setTimeRemaining(null);
      } else {
        setTimeRemaining(formatTimeRemaining(requestExpiresAt));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isPendingRequest, requestExpiresAt]);
  // Build initial messages based on conversation type and initial message
  const buildInitialMessages = React.useCallback((): Message[] => {
    const messages: Message[] = [];

    if (conversationType === "incoming") {
      // Client wrote to me about my service - their message is from "provider" perspective (the other person)
      if (initialMessage) {
        messages.push({
          id: 1,
          text: initialMessage,
          sender: "provider", // "provider" here means the other person in chat
          timestamp: initialMessageTime || new Date(Date.now() - 60000),
        });
      }
    } else {
      // I wrote to a provider about their service
      // First show greeting from provider
      messages.push({
        id: 1,
        text: `Сайн байна уу! "${serviceTitle}" үйлчилгээний талаар асуух зүйл байвал бичнэ үү.`,
        sender: "provider",
        timestamp: new Date(Date.now() - 120000),
      });
      // Then show my message if exists
      if (initialMessage) {
        messages.push({
          id: 2,
          text: initialMessage,
          sender: "user",
          timestamp: initialMessageTime || new Date(Date.now() - 60000),
        });
      }
    }

    return messages;
  }, [conversationType, initialMessage, initialMessageTime, serviceTitle]);

  const [messages, setMessages] = React.useState<Message[]>(buildInitialMessages);

  // Reset messages when conversation changes
  React.useEffect(() => {
    if (open) {
      setMessages(buildInitialMessages());
    }
  }, [open, buildInitialMessages]);
  const [newMessage, setNewMessage] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setNewMessage("");

    // Simulate provider response
    setTimeout(() => {
      const providerMessage: Message = {
        id: Date.now() + 1,
        text: "Баярлалаа! Таны хүсэлтийг хүлээн авлаа. Удахгүй холбогдох болно.",
        sender: "provider",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, providerMessage]);
    }, 1500);
  };

  const handleDeleteMessage = (messageId: number) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("mn-MN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md lg:max-w-2xl h-[80vh] max-h-[600px] lg:max-h-[800px] rounded-xl p-0 flex flex-col">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img
              src={provider.avatar}
              alt={provider.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">{provider.name}</p>
              <p className="text-xs text-green-500 font-normal">Онлайн</p>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-primary mr-6">
              <Phone className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`group relative max-w-[80%] ${message.sender === "user" ? "flex flex-row-reverse items-start gap-1" : ""}`}>
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-background border rounded-bl-md"
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
                {/* Delete button for user messages */}
                {message.sender === "user" && (
                  <button
                    onClick={() => handleDeleteMessage(message.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-full self-center"
                    title="Устгах"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input or Accept/Decline buttons */}
        <div className="p-4 border-t shrink-0 bg-background rounded-b-xl">
          {isPendingRequest ? (
            <div className="space-y-3">
              {/* Timer */}
              <div className="flex items-center justify-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Хариу өгөх хугацаа: <span className="font-mono font-bold">{timeRemaining || "00:00"}</span>
                </span>
              </div>
              {/* Accept/Decline buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => {
                    onDecline?.();
                    onOpenChange(false);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Татгалзах
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    onAccept?.();
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Хүлээн авах
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2 items-center"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem className="gap-3 cursor-pointer">
                    <MapPin className="h-4 w-4" />
                    <span>Локаци</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 cursor-pointer">
                    <Image className="h-4 w-4" />
                    <span>Фото</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 cursor-pointer">
                    <Video className="h-4 w-4" />
                    <span>Видео</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                placeholder="Мессеж бичих..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
