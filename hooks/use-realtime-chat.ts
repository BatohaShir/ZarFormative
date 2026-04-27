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

// ZenStack writes findMany cache slots under
//   ["zenstack", model, op, args, {infinite, optimisticUpdate}]
// — TanStack Query v5 prefix-matches from index 0, so a
// ["zenstack", "chat_messages", "findMany"] filter catches every
// args variant for this hook (the request-scoped one we use plus
// any seeded slot the parent might add).
const CHAT_MESSAGES_KEY = ["zenstack", "chat_messages", "findMany"];

/**
 * Realtime chat sync.
 *
 * Why this hook patches the cache directly instead of invalidating:
 * each chat message round-trips MN ↔ Seoul; an INSERT event firing
 * `invalidateQueries` + `refetchQueries` then awaits a fresh
 * findMany pull just to learn the same row that was already in
 * the realtime payload. On a slow link the sender sees their own
 * optimistic message disappear into a loading state while the
 * refetch runs. Now: INSERT → append the row to the cache slot →
 * receiver sees it instantly with zero round-trips.
 *
 * Sender-side dedup: when an INSERT comes back from the same
 * userId, drop the matching optimistic placeholder and append the
 * real row in its place.
 */
function payloadToMessage(payload: ChatMessagePayload): ChatMessage {
  return {
    id: payload.id,
    request_id: payload.request_id,
    sender_id: payload.sender_id,
    message: payload.message,
    is_read: payload.is_read,
    created_at: parsePgTimestamp(payload.created_at),
    read_at: payload.read_at ? parsePgTimestamp(payload.read_at) : null,
    updated_at: parsePgTimestamp(payload.created_at),
    attachment_type: payload.attachment_type,
    attachment_url: payload.attachment_url,
    location_lat: payload.location_lat != null ? new Decimal(payload.location_lat) : null,
    location_lng: payload.location_lng != null ? new Decimal(payload.location_lng) : null,
    location_name: payload.location_name,
  };
}

/**
 * The chat_messages.created_at column is `timestamp without time zone`,
 * so postgres_changes payloads ship strings like "2026-04-27T20:14:23"
 * — no trailing Z. JavaScript `new Date(s)` interprets a Z-less ISO
 * string as LOCAL time, which is wrong: postgres always stores UTC
 * here (the writes go through Prisma's `now()`, which is UTC). On a
 * UTC+8 client that mis-parse rendered every realtime message 8 hours
 * in the past — the user saw the optimistic copy "0 минутын өмнө"
 * jump back to "8 цагийн өмнө" the instant the realtime patch landed.
 *
 * Force-append Z when missing so Date() treats the string as UTC.
 */
function parsePgTimestamp(raw: string): Date {
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  return new Date(hasTz ? raw : `${raw}Z`);
}

export function useRealtimeChat(options: UseRealtimeChatOptions) {
  const { requestId, enabled = true, onNewMessage, onMessageRead } = options;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isConnected, setIsConnected] = useState(false);

  // Refs for stable callbacks
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  const onMessageReadRef = useRef(onMessageRead);
  useEffect(() => {
    onMessageReadRef.current = onMessageRead;
  }, [onMessageRead]);

  /**
   * Append/replace/patch a row in every chat_messages findMany cache
   * slot for the active request. Returns nothing — purely a side
   * effect on the cache.
   */
  const upsertCachedMessage = useCallback(
    (incoming: ChatMessage) => {
      queryClient.setQueriesData<ChatMessage[]>({ queryKey: CHAT_MESSAGES_KEY }, (old) => {
        if (!old) return old;
        // Drop our own optimistic row if the real one with the same
        // payload arrives back from the server.
        const withoutOptimistic = old.filter(
          (m) =>
            !(
              m.$optimistic &&
              m.request_id === incoming.request_id &&
              m.sender_id === incoming.sender_id &&
              m.message === incoming.message
            )
        );
        // If we already have the real row (subsequent UPDATE event),
        // patch it in place; otherwise append.
        const existingIdx = withoutOptimistic.findIndex((m) => m.id === incoming.id);
        if (existingIdx >= 0) {
          const next = withoutOptimistic.slice();
          next[existingIdx] = { ...next[existingIdx], ...incoming };
          return next;
        }
        return [...withoutOptimistic, incoming];
      });
    },
    [queryClient]
  );

  const removeCachedMessage = useCallback(
    (id: string) => {
      queryClient.setQueriesData<ChatMessage[]>({ queryKey: CHAT_MESSAGES_KEY }, (old) => {
        if (!old) return old;
        const next = old.filter((m) => m.id !== id);
        return next.length === old.length ? old : next;
      });
    },
    [queryClient]
  );

  /**
   * Add optimistic message to cache. Used by the parent's send
   * handler; the realtime INSERT will replace it once the server
   * confirms. Returns the synthetic id so the caller can roll back
   * on send failure.
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
      };

      queryClient.setQueriesData<ChatMessage[]>({ queryKey: CHAT_MESSAGES_KEY }, (old) => {
        if (!old) return [optimisticMessage];
        const hasOurRequest = old.some((m) => m.request_id === requestId);
        if (hasOurRequest || old.length === 0) {
          return [...old, optimisticMessage];
        }
        return old;
      });

      return optimisticMessage.id;
    },
    [queryClient, requestId]
  );

  const removeOptimisticMessage = useCallback(
    (optimisticId: string) => removeCachedMessage(optimisticId),
    [removeCachedMessage]
  );

  /**
   * Replace optimistic message with the server-confirmed one. Most
   * code paths don't need to call this explicitly anymore — the
   * realtime INSERT does it automatically — but kept for callers
   * that confirm via the mutation's onSuccess.
   */
  const replaceOptimisticMessage = useCallback(
    (optimisticId: string, realMessage: ChatMessage) => {
      queryClient.setQueriesData<ChatMessage[]>({ queryKey: CHAT_MESSAGES_KEY }, (old) => {
        if (!old) return [realMessage];
        return old.map((m) => (m.id === optimisticId ? realMessage : m));
      });
    },
    [queryClient]
  );

  // Kept for backwards compat with callers that still want a hard
  // refresh path. New code should rely on the per-event patch above.
  const invalidateMessages = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CHAT_MESSAGES_KEY });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || !requestId || !user?.id) return;

    const supabase = createClient();
    const userId = user.id;

    // Подписываемся на ВСЕ изменения без фильтров и фильтруем на
    // клиенте — Supabase Realtime фильтры могут молча терять события
    // если REPLICA IDENTITY на таблице настроен не так.
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

          const isOurRequest =
            newData?.request_id === requestId || oldData?.request_id === requestId;
          if (!isOurRequest) return;

          if (payload.eventType === "INSERT" && newData) {
            const real = payloadToMessage(newData);
            // Patch cache directly — no refetch round-trip. The
            // optimistic message (if any) is matched by sender +
            // text and dropped in upsertCachedMessage.
            upsertCachedMessage(real);

            // Counterparty notification callback — only for messages
            // not authored by the current user.
            if (newData.sender_id !== userId && onNewMessageRef.current) {
              onNewMessageRef.current(real);
            }
            return;
          }

          if (payload.eventType === "UPDATE" && newData) {
            const real = payloadToMessage(newData);
            upsertCachedMessage(real);

            const wasUnread = oldData?.is_read === false;
            const nowRead = newData.is_read === true;
            if (wasUnread && nowRead && onMessageReadRef.current) {
              onMessageReadRef.current(newData.id);
            }
            return;
          }

          if (payload.eventType === "DELETE" && oldData) {
            removeCachedMessage(oldData.id);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") setIsConnected(true);
        else if (status === "CHANNEL_ERROR" || status === "CLOSED" || status === "TIMED_OUT")
          setIsConnected(false);
      });

    return () => {
      setIsConnected(false);
      supabase.removeChannel(channel);
    };
  }, [enabled, requestId, user?.id, upsertCachedMessage, removeCachedMessage]);

  return {
    isConnected,
    addOptimisticMessage,
    removeOptimisticMessage,
    replaceOptimisticMessage,
    invalidateMessages,
  };
}
