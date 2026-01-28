"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { listing_requests } from "@prisma/client";

// Тип payload от Supabase Realtime
type RequestPayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  old: Partial<listing_requests> | null;
  new: Partial<listing_requests> | null;
};

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
 */
export function useRealtimeRequests(options?: {
  showToasts?: boolean;
  onStatusChange?: (requestId: string, newStatus: string, oldStatus: string | null) => void;
}) {
  const { showToasts = true, onStatusChange } = options || {};
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const invalidateRequests = useCallback(() => {
    // Инвалидируем все запросы заявок
    queryClient.invalidateQueries({ queryKey: ["listing_requests", "findMany"] });
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const supabase = createClient();
    let clientChannel: RealtimeChannel | null = null;
    let providerChannel: RealtimeChannel | null = null;

    // Подписка на заявки где я клиент
    clientChannel = supabase
      .channel(`requests-client:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listing_requests",
          filter: `client_id=eq.${user.id}`,
        },
        (payload: { eventType: string; old: Record<string, unknown> | null; new: Record<string, unknown> | null }) => {
          const typedPayload = payload as unknown as RequestPayload;
          handleRequestChange(typedPayload, "client");
        }
      )
      .subscribe();

    // Подписка на заявки где я исполнитель
    providerChannel = supabase
      .channel(`requests-provider:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listing_requests",
          filter: `provider_id=eq.${user.id}`,
        },
        (payload: { eventType: string; old: Record<string, unknown> | null; new: Record<string, unknown> | null }) => {
          const typedPayload = payload as unknown as RequestPayload;
          handleRequestChange(typedPayload, "provider");
        }
      )
      .subscribe();

    function handleRequestChange(payload: RequestPayload, role: "client" | "provider") {
      const { eventType, old: oldData, new: newData } = payload;

      if (eventType === "INSERT") {
        // Новая заявка
        invalidateRequests();

        if (showToasts && role === "provider") {
          toast.info("Шинэ хүсэлт ирлээ", {
            description: "Шинэ үйлчилгээний хүсэлт ирлээ",
          });
        }
      } else if (eventType === "UPDATE") {
        const oldStatus = oldData?.status as string | null;
        const newStatus = newData?.status as string;
        const requestId = newData?.id as string;

        // Статус изменился
        if (oldStatus !== newStatus) {
          invalidateRequests();

          // Вызываем callback если есть
          if (onStatusChange && requestId) {
            onStatusChange(requestId, newStatus, oldStatus);
          }

          // Показываем toast о смене статуса
          if (showToasts && STATUS_MESSAGES[newStatus]) {
            const msg = STATUS_MESSAGES[newStatus];
            toast.info(msg.title, {
              description: msg.description,
            });
          }
        } else {
          // Другие поля изменились (completion_description, etc.)
          // Проверяем изменение completion данных
          const completionChanged =
            oldData?.completion_description !== newData?.completion_description ||
            oldData?.completion_photos !== newData?.completion_photos;

          if (completionChanged) {
            invalidateRequests();

            if (showToasts && role === "client") {
              toast.info("Ажлын тайлан ирлээ", {
                description: "Үйлчилгээ үзүүлэгч ажлын тайлан илгээлээ",
              });
            }
          } else {
            // Любые другие обновления
            invalidateRequests();
          }
        }
      } else if (eventType === "DELETE") {
        invalidateRequests();
      }
    }

    return () => {
      if (clientChannel) {
        supabase.removeChannel(clientChannel);
      }
      if (providerChannel) {
        supabase.removeChannel(providerChannel);
      }
    };
  }, [isAuthenticated, user?.id, invalidateRequests, showToasts, onStatusChange]);
}
