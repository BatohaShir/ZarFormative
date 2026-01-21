"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ListingPayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  old: {
    id?: string;
    views_count?: number;
    [key: string]: unknown;
  } | null;
  new: {
    id?: string;
    views_count?: number;
    [key: string]: unknown;
  } | null;
};

/**
 * Хук для real-time синхронизации списка объявлений
 * Автоматически инвалидирует кэш React Query при изменениях в БД
 */
export function useRealtimeListings() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    channel = supabase
      .channel("listings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
          filter: "status=eq.active",
        },
        (payload: { eventType: string; old: Record<string, unknown> | null; new: Record<string, unknown> | null }) => {
          const typedPayload = payload as unknown as ListingPayload;

          // Инвалидируем кэш при изменениях
          if (typedPayload.eventType === "INSERT") {
            // Новое объявление - обновляем списки
            queryClient.invalidateQueries({ queryKey: ["listings", "findMany"] });
          } else if (typedPayload.eventType === "UPDATE") {
            // Обновление - обновляем конкретное объявление
            const listingId = typedPayload.new?.id;
            if (listingId) {
              queryClient.invalidateQueries({
                queryKey: ["listings", "findUnique", { where: { id: listingId } }],
              });
              // Также обновляем списки если изменился views_count
              if (typedPayload.old?.views_count !== typedPayload.new?.views_count) {
                queryClient.invalidateQueries({ queryKey: ["listings", "findMany"] });
              }
            }
          } else if (typedPayload.eventType === "DELETE") {
            // Удаление - обновляем списки
            queryClient.invalidateQueries({ queryKey: ["listings", "findMany"] });
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);
}
