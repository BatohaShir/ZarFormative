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
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const refetchRequests = useCallback(() => {
    // Invalidate listing_requests queries scoped to the current user
    // This avoids refetching data for all users on the client
    queryClient.invalidateQueries({
      queryKey: ["listing_requests"],
    });

    // Refetch only active queries to ensure UI updates immediately
    queryClient.refetchQueries({
      queryKey: ["listing_requests"],
      type: "active",
    });
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const supabase = createClient();
    const userId = user.id;

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

            if (oldStatus !== newStatus) {
              // Статус изменился
              refetchRequests();

              if (onStatusChangeRef.current && requestId && newStatus) {
                onStatusChangeRef.current(requestId, newStatus, oldStatus || null);
              }

              // Показываем toast только клиенту (его заявка обновилась исполнителем)
              if (
                newData?.client_id === userId &&
                showToasts &&
                newStatus &&
                STATUS_MESSAGES[newStatus]
              ) {
                const msg = STATUS_MESSAGES[newStatus];
                toast.info(msg.title, {
                  description: msg.description,
                });
              }
            } else {
              // Другие поля изменились (например, completion_description)
              const completionChanged =
                oldData?.completion_description !== newData?.completion_description ||
                JSON.stringify(oldData?.completion_photos) !==
                  JSON.stringify(newData?.completion_photos);

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, refetchRequests, showToasts]);
}
