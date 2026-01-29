"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { createRealtimeSubscription } from "@/lib/realtime-utils";
import type { chat_messages } from "@prisma/client";
import { Prisma } from "@prisma/client";

interface ChatMessage extends chat_messages {
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

interface UseRealtimeChatOptions {
  requestId: string;
  enabled?: boolean;
  onNewMessage?: (message: ChatMessage) => void;
  onMessageRead?: (messageId: string) => void;
}

/**
 * Hook for real-time chat synchronization
 * - Subscribes to INSERT events (new messages)
 * - Subscribes to UPDATE events (read status)
 * - Uses retry logic with exponential backoff
 * - Supports optimistic updates
 */
export function useRealtimeChat(options: UseRealtimeChatOptions) {
  const { requestId, enabled = true, onNewMessage, onMessageRead } = options;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isConnected, setIsConnected] = useState(true);

  // Refs for stable callbacks
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  const onMessageReadRef = useRef(onMessageRead);
  onMessageReadRef.current = onMessageRead;

  const invalidateMessages = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["chat_messages", "findMany"],
    });
  }, [queryClient]);

  /**
   * Add optimistic message to cache
   */
  const addOptimisticMessage = useCallback(
    (message: Omit<ChatMessage, "id" | "created_at" | "updated_at" | "location_lat" | "location_lng"> & {
      location_lat?: number | null;
      location_lng?: number | null;
    }) => {
      const optimisticMessage: ChatMessage = {
        ...message,
        id: `optimistic-${Date.now()}`,
        created_at: new Date(),
        updated_at: new Date(),
        location_lat: message.location_lat ? new Prisma.Decimal(message.location_lat) : null,
        location_lng: message.location_lng ? new Prisma.Decimal(message.location_lng) : null,
        $optimistic: true,
      } as ChatMessage;

      // Add to cache
      queryClient.setQueryData<ChatMessage[]>(
        ["chat_messages", "findMany", { where: { request_id: requestId } }],
        (old) => {
          if (!old) return [optimisticMessage];
          return [...old, optimisticMessage];
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
      queryClient.setQueryData<ChatMessage[]>(
        ["chat_messages", "findMany", { where: { request_id: requestId } }],
        (old) => {
          if (!old) return [];
          return old.filter((m) => m.id !== optimisticId);
        }
      );
    },
    [queryClient, requestId]
  );

  /**
   * Replace optimistic message with real one
   */
  const replaceOptimisticMessage = useCallback(
    (optimisticId: string, realMessage: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(
        ["chat_messages", "findMany", { where: { request_id: requestId } }],
        (old) => {
          if (!old) return [realMessage];
          return old.map((m) => (m.id === optimisticId ? realMessage : m));
        }
      );
    },
    [queryClient, requestId]
  );

  useEffect(() => {
    if (!enabled || !requestId || !user?.id) return;

    const subscription = createRealtimeSubscription<chat_messages>({
      channelName: `chat-messages:${requestId}`,
      table: "chat_messages",
      filter: `request_id=eq.${requestId}`,
      event: "*",
      onInsert: (payload) => {
        const newMessage = payload.new as ChatMessage;

        // If message is from another user, add to cache immediately
        if (newMessage.sender_id !== user.id) {
          invalidateMessages();

          if (onNewMessageRef.current) {
            onNewMessageRef.current(newMessage);
          }
        } else {
          // Our own message - might already be in cache as optimistic
          // Just invalidate to get the real data
          invalidateMessages();
        }

        setIsConnected(true);
      },
      onUpdate: (payload) => {
        const updatedMessage = payload.new as ChatMessage;
        const oldMessage = payload.old as Partial<ChatMessage>;

        // Check if read status changed
        if (oldMessage.is_read === false && updatedMessage.is_read === true) {
          invalidateMessages();

          if (onMessageReadRef.current && updatedMessage.id) {
            onMessageReadRef.current(updatedMessage.id);
          }
        } else {
          // Other update
          invalidateMessages();
        }

        setIsConnected(true);
      },
    });

    return () => {
      subscription.unsubscribe();
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
