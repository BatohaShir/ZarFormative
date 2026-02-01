"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Decimal } from "decimal.js";

// Тип для chat_messages (соответствует Prisma модели)
interface ChatMessageBase {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: Date;
  read_at: Date | null;
  attachment_type: string | null;
  attachment_url: string | null;
  location_lat: Decimal | null;
  location_lng: Decimal | null;
  location_name: string | null;
  updated_at: Date;
}

interface ChatMessage extends ChatMessageBase {
  sender?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    is_company: boolean;
    avatar_url: string | null;
  };
  $optimistic?: boolean;
}

// Тип для payload от Supabase
interface ChatMessagePayload {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  attachment_type: string | null;
  attachment_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  [key: string]: unknown;
}

interface UseRealtimeChatOptions {
  requestId: string;
  enabled?: boolean;
  onNewMessage?: (message: ChatMessage) => void;
  onMessageRead?: (messageId: string) => void;
}

/**
 * Hook for real-time chat synchronization
 *
 * CRITICAL FIX: Подписываемся на ВСЕ изменения таблицы без фильтров
 * и фильтруем на клиенте. Это гарантирует доставку событий.
 * (По аналогии с use-realtime-requests.ts)
 */
export function useRealtimeChat(options: UseRealtimeChatOptions) {
  const { requestId, enabled = true, onNewMessage, onMessageRead } = options;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isConnected, setIsConnected] = useState(false);

  // Refs for stable callbacks
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  const onMessageReadRef = useRef(onMessageRead);
  onMessageReadRef.current = onMessageRead;

  const invalidateMessages = useCallback(() => {
    console.log("[useRealtimeChat] Invalidating chat_messages queries");

    // Invalidate all chat_messages queries
    queryClient.invalidateQueries({
      queryKey: ["chat_messages"],
    });

    // Also refetch active queries immediately
    queryClient.refetchQueries({
      queryKey: ["chat_messages"],
      type: "active",
    });
  }, [queryClient]);

  /**
   * Add optimistic message to cache
   */
  const addOptimisticMessage = useCallback(
    (message: {
      request_id: string;
      sender_id: string;
      message: string;
      attachment_type?: string | null;
      attachment_url?: string | null;
      location_lat?: number | null;
      location_lng?: number | null;
      location_name?: string | null;
      is_read: boolean;
      read_at?: Date | null;
      sender?: ChatMessage["sender"];
    }) => {
      const optimisticMessage: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        request_id: message.request_id,
        sender_id: message.sender_id,
        message: message.message,
        attachment_type: message.attachment_type || null,
        attachment_url: message.attachment_url || null,
        location_lat: message.location_lat ? new Decimal(message.location_lat) : null,
        location_lng: message.location_lng ? new Decimal(message.location_lng) : null,
        location_name: message.location_name || null,
        is_read: message.is_read,
        read_at: message.read_at || null,
        created_at: new Date(),
        updated_at: new Date(),
        sender: message.sender,
        $optimistic: true,
      } as ChatMessage;

      // Add to cache - use partial key match
      queryClient.setQueriesData<ChatMessage[]>(
        { queryKey: ["chat_messages", "findMany"] },
        (old) => {
          if (!old) return [optimisticMessage];
          // Only add to queries for this request
          const hasOurRequest = old.some(m => m.request_id === requestId);
          if (hasOurRequest || old.length === 0) {
            return [...old, optimisticMessage];
          }
          return old;
        }
      );

      return optimisticMessage.id;
    },
    [queryClient, requestId]
  );

  /**
   * Remove optimistic message from cache (on error)
   */
  const removeOptimisticMessage = useCallback(
    (optimisticId: string) => {
      queryClient.setQueriesData<ChatMessage[]>(
        { queryKey: ["chat_messages", "findMany"] },
        (old) => {
          if (!old) return [];
          return old.filter((m) => m.id !== optimisticId);
        }
      );
    },
    [queryClient]
  );

  /**
   * Replace optimistic message with real one
   */
  const replaceOptimisticMessage = useCallback(
    (optimisticId: string, realMessage: ChatMessage) => {
      queryClient.setQueriesData<ChatMessage[]>(
        { queryKey: ["chat_messages", "findMany"] },
        (old) => {
          if (!old) return [realMessage];
          return old.map((m) => (m.id === optimisticId ? realMessage : m));
        }
      );
    },
    [queryClient]
  );

  useEffect(() => {
    if (!enabled || !requestId || !user?.id) return;

    const supabase = createClient();
    const userId = user.id;

    console.log("[useRealtimeChat] Setting up realtime subscription for request:", requestId, "user:", userId);

    // CRITICAL: Подписываемся на ВСЕ изменения без фильтров
    // Фильтры Supabase Realtime могут не работать если REPLICA IDENTITY неправильно настроен
    // Фильтруем на клиенте для надёжности
    const channel = supabase
      .channel(`chat-messages-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        (payload: RealtimePostgresChangesPayload<ChatMessagePayload>) => {
          const newData = payload.new as ChatMessagePayload | null;
          const oldData = payload.old as ChatMessagePayload | null;

          // Проверяем что это событие относится к нашему request_id
          const isOurRequest =
            newData?.request_id === requestId ||
            oldData?.request_id === requestId;

          if (!isOurRequest) {
            // Это событие не для нас, игнорируем
            return;
          }

          console.log("[useRealtimeChat] Received event:", {
            eventType: payload.eventType,
            messageId: newData?.id || oldData?.id,
            senderId: newData?.sender_id,
            isOwnMessage: newData?.sender_id === userId,
            isRead: newData?.is_read,
            wasRead: oldData?.is_read,
          });

          if (payload.eventType === "INSERT") {
            // Новое сообщение
            console.log("[useRealtimeChat] INSERT - New message received");

            // Инвалидируем кэш для получения актуальных данных
            invalidateMessages();

            // Если сообщение от другого пользователя - вызываем callback
            if (newData?.sender_id !== userId && onNewMessageRef.current) {
              onNewMessageRef.current(newData as unknown as ChatMessage);
            }
          } else if (payload.eventType === "UPDATE") {
            const wasRead = oldData?.is_read === false;
            const nowRead = newData?.is_read === true;

            console.log("[useRealtimeChat] UPDATE - wasRead:", wasRead, "nowRead:", nowRead);

            // Проверяем изменение статуса прочтения
            if (wasRead && nowRead) {
              console.log("[useRealtimeChat] Message marked as read");
              invalidateMessages();

              if (onMessageReadRef.current && newData?.id) {
                onMessageReadRef.current(newData.id);
              }
            } else {
              // Другое обновление
              invalidateMessages();
            }
          } else if (payload.eventType === "DELETE") {
            console.log("[useRealtimeChat] DELETE - Message deleted");
            invalidateMessages();
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        console.log("[useRealtimeChat] Subscription status:", status);
        if (err) {
          console.error("[useRealtimeChat] Subscription error:", err);
        }
        if (status === "SUBSCRIBED") {
          console.log("[useRealtimeChat] ✅ Successfully subscribed to chat_messages changes");
          setIsConnected(true);
        } else if (status === "CHANNEL_ERROR") {
          console.error("[useRealtimeChat] ❌ Channel error - check Supabase Realtime configuration!");
          console.error("[useRealtimeChat] Make sure chat_messages is added to supabase_realtime publication:");
          console.error("[useRealtimeChat] ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;");
          setIsConnected(false);
        } else if (status === "CLOSED" || status === "TIMED_OUT") {
          setIsConnected(false);
        }
      });

    return () => {
      console.log("[useRealtimeChat] Cleaning up subscription for request:", requestId);
      setIsConnected(false);
      supabase.removeChannel(channel);
    };
  }, [enabled, requestId, user?.id, invalidateMessages]);

  return {
    isConnected,
    addOptimisticMessage,
    removeOptimisticMessage,
    replaceOptimisticMessage,
    invalidateMessages,
  };
}
