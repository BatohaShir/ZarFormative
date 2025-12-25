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
import { Send, ArrowLeft, Phone, Trash2, Paperclip, MapPin, Image, Video } from "lucide-react";
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
}

export function ChatModal({ open, onOpenChange, provider, serviceTitle }: ChatModalProps) {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: 1,
      text: `Сайн байна уу! "${serviceTitle}" үйлчилгээний талаар асуух зүйл байвал бичнэ үү.`,
      sender: "provider",
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
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

        {/* Input */}
        <div className="p-4 border-t shrink-0 bg-background rounded-b-xl">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
