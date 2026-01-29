"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { createRealtimeSubscription } from "@/lib/realtime-utils";
import type { listing_requests } from "@prisma/client";

// Сообщения о статусах на монгольском
const STATUS_MESSAGES: Record<string, { title: string; description: string }> = {
  accepted: {
    title: "Хүсэлт батлагдлаа",
    description: "Үйлчилгээ үзүүлэгч таны хүсэлтийг зөвшөөрлөө",
  },
  rejected: {
    title: "Хүсэлт татгалзлаа",
    description: "Үйлчилгээ үзүүлэгч хүсэлтийг татгалзлаа",
  },
  in_progress: {
    title: "Ажил эхэллээ",
    description: "Үйлчилгээ үзүүлэгч ажиллаж эхэллээ",
  },
  awaiting_client_confirmation: {
    title: "Баталгаажуулалт хүлээж байна",
    description: "Үйлчилгээ үзүүлэгч ажлаа дуусгасан гэж мэдэгдлээ",
  },
  awaiting_payment: {
    title: "Төлбөр хүлээгдэж байна",
    description: "Ажил баталгаажсан, төлбөр хийнэ үү",
  },
  completed: {
    title: "Дууссан",
    description: "Хүсэлт амжилттай дууссан",
  },
  cancelled: {
    title: "Цуцлагдсан",
    description: "Хүсэлт цуцлагдлаа",
  },
};

/**
 * Хук для real-time синхронизации статусов заявок
 * Автоматически инвалидирует кэш React Query и показывает toast при изменении статуса
 * Uses retry logic with exponential backoff
 */
export function useRealtimeRequests(options?: {
  showToasts?: boolean;
  onStatusChange?: (requestId: string, newStatus: string, oldStatus: string | null) => void;
}) {
  const { showToasts = true, onStatusChange } = options || {};
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // Refs for stable callbacks
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const refetchRequests = useCallback(() => {
    // OPTIMIZATION: Use refetchQueries instead of invalidateQueries for immediate update
    // invalidateQueries only marks data as stale, but doesn't trigger refetch immediately
    // refetchQueries forces an immediate refetch regardless of staleTime
    queryClient.refetchQueries({
      queryKey: ["listing_requests", "findMany"],
      type: "active", // Only refetch active queries (currently mounted components)
    });
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Подписка на заявки где я клиент
    const clientSub = createRealtimeSubscription<listing_requests>({
      channelName: `requests-client:${user.id}`,
      table: "listing_requests",
      filter: `client_id=eq.${user.id}`,
      event: "*",
      onInsert: () => {
        refetchRequests();
      },
      onUpdate: (payload) => {
        const oldData = payload.old;
        const newData = payload.new;
        const oldStatus = (oldData as listing_requests | null)?.status;
        const newStatus = (newData as listing_requests).status;
        const requestId = (newData as listing_requests).id;

        if (oldStatus !== newStatus) {
          refetchRequests();

          if (onStatusChangeRef.current && requestId) {
            onStatusChangeRef.current(requestId, newStatus, oldStatus || null);
          }

          if (showToasts && STATUS_MESSAGES[newStatus]) {
            const msg = STATUS_MESSAGES[newStatus];
            toast.info(msg.title, {
              description: msg.description,
            });
          }
        } else {
          // Другие поля изменились
          const completionChanged =
            (oldData as listing_requests | null)?.completion_description !== (newData as listing_requests).completion_description ||
            (oldData as listing_requests | null)?.completion_photos !== (newData as listing_requests).completion_photos;

          if (completionChanged && showToasts) {
            toast.info("Ажлын тайлан ирлээ", {
              description: "Үйлчилгээ үзүүлэгч ажлын тайлан илгээлээ",
            });
          }
          refetchRequests();
        }
      },
      onDelete: () => {
        refetchRequests();
      },
    });

    // Подписка на заявки где я исполнитель
    const providerSub = createRealtimeSubscription<listing_requests>({
      channelName: `requests-provider:${user.id}`,
      table: "listing_requests",
      filter: `provider_id=eq.${user.id}`,
      event: "*",
      onInsert: () => {
        refetchRequests();
        if (showToasts) {
          toast.info("Шинэ хүсэлт ирлээ", {
            description: "Шинэ үйлчилгээний хүсэлт ирлээ",
          });
        }
      },
      onUpdate: (payload) => {
        const oldData = payload.old;
        const newData = payload.new;
        const oldStatus = (oldData as listing_requests | null)?.status;
        const newStatus = (newData as listing_requests).status;
        const requestId = (newData as listing_requests).id;

        if (oldStatus !== newStatus) {
          refetchRequests();

          if (onStatusChangeRef.current && requestId) {
            onStatusChangeRef.current(requestId, newStatus, oldStatus || null);
          }
        } else {
          refetchRequests();
        }
      },
      onDelete: () => {
        refetchRequests();
      },
    });

    return () => {
      clientSub.unsubscribe();
      providerSub.unsubscribe();
    };
  }, [isAuthenticated, user?.id, refetchRequests, showToasts]);
}
