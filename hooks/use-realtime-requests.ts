"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Тип для записи listing_requests из payload
interface ListingRequestPayload {
  id: string;
  client_id: string;
  provider_id: string;
  status: string;
  completion_description?: string | null;
  completion_photos?: string[] | null;
  [key: string]: unknown;
}

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
 *
 * CRITICAL FIX: Подписываемся на ВСЕ изменения таблицы без фильтров
 * и фильтруем на клиенте. Это гарантирует доставку событий.
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
    // CRITICAL FIX: Use invalidateQueries with broader key matching
    // This ensures ALL queries with "listing_requests" prefix are invalidated
    console.log("[useRealtimeRequests] Invalidating all listing_requests queries");

    // Invalidate all listing_requests queries (findMany, findUnique, findFirst, etc.)
    queryClient.invalidateQueries({
      queryKey: ["listing_requests"],
    });

    // Also refetch active queries immediately to ensure UI updates
    queryClient.refetchQueries({
      queryKey: ["listing_requests"],
      type: "active",
    });
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const supabase = createClient();
    const userId = user.id;

    console.log("[useRealtimeRequests] Setting up realtime subscription for user:", userId);

    // CRITICAL: Подписываемся на ВСЕ изменения без фильтров
    // Фильтры Supabase Realtime могут не работать если REPLICA IDENTITY неправильно настроен
    // или если колонки не индексированы. Фильтруем на клиенте для надёжности.
    const channel = supabase
      .channel(`listing-requests-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listing_requests",
        },
        (payload: RealtimePostgresChangesPayload<ListingRequestPayload>) => {
          const newData = payload.new as ListingRequestPayload | null;
          const oldData = payload.old as ListingRequestPayload | null;

          // Проверяем что это событие относится к текущему пользователю
          const isMyRequest =
            newData?.client_id === userId ||
            newData?.provider_id === userId ||
            oldData?.client_id === userId ||
            oldData?.provider_id === userId;

          if (!isMyRequest) {
            // Это событие не для нас, игнорируем
            return;
          }

          console.log("[useRealtimeRequests] Received event:", {
            eventType: payload.eventType,
            requestId: newData?.id || oldData?.id,
            oldStatus: oldData?.status,
            newStatus: newData?.status,
            isClient: newData?.client_id === userId,
            isProvider: newData?.provider_id === userId,
          });

          if (payload.eventType === "INSERT") {
            // Новая заявка
            refetchRequests();

            // Показываем toast только исполнителю (получил новую заявку)
            if (newData?.provider_id === userId && showToasts) {
              toast.info("Шинэ хүсэлт ирлээ", {
                description: "Шинэ үйлчилгээний хүсэлт ирлээ",
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const oldStatus = oldData?.status;
            const newStatus = newData?.status;
            const requestId = newData?.id;

            console.log("[useRealtimeRequests] UPDATE - Status change:", oldStatus, "->", newStatus);

            if (oldStatus !== newStatus) {
              // Статус изменился
              console.log("[useRealtimeRequests] Status changed! Triggering refetch...");
              refetchRequests();

              if (onStatusChangeRef.current && requestId && newStatus) {
                onStatusChangeRef.current(requestId, newStatus, oldStatus || null);
              }

              // Показываем toast только клиенту (его заявка обновилась исполнителем)
              if (newData?.client_id === userId && showToasts && newStatus && STATUS_MESSAGES[newStatus]) {
                const msg = STATUS_MESSAGES[newStatus];
                toast.info(msg.title, {
                  description: msg.description,
                });
              }
            } else {
              // Другие поля изменились (например, completion_description)
              const completionChanged =
                oldData?.completion_description !== newData?.completion_description ||
                JSON.stringify(oldData?.completion_photos) !== JSON.stringify(newData?.completion_photos);

              if (completionChanged && newData?.client_id === userId && showToasts) {
                toast.info("Ажлын тайлан ирлээ", {
                  description: "Үйлчилгээ үзүүлэгч ажлын тайлан илгээлээ",
                });
              }
              refetchRequests();
            }
          } else if (payload.eventType === "DELETE") {
            refetchRequests();
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        console.log("[useRealtimeRequests] Subscription status:", status);
        if (err) {
          console.error("[useRealtimeRequests] Subscription error:", err);
        }
        if (status === "SUBSCRIBED") {
          console.log("[useRealtimeRequests] ✅ Successfully subscribed to listing_requests changes");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[useRealtimeRequests] ❌ Channel error - check Supabase Realtime configuration");
        }
      });

    return () => {
      console.log("[useRealtimeRequests] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, refetchRequests, showToasts]);
}
