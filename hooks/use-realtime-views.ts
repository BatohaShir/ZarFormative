"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeViewsOptions {
  listingId: string;
  initialCount: number;
  enabled?: boolean;
}

/**
 * Хук для real-time обновления счётчика просмотров объявления
 * Использует Supabase Realtime для автоматического обновления при изменении в БД
 */
export function useRealtimeViews({
  listingId,
  initialCount,
  enabled = true,
}: UseRealtimeViewsOptions) {
  const [viewsCount, setViewsCount] = useState(initialCount);
  const [isConnected, setIsConnected] = useState(false);

  // Обновить счётчик при изменении initialCount
  useEffect(() => {
    setViewsCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!enabled || !listingId) return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      // Подписываемся на изменения в таблице listings для конкретного объявления
      channel = supabase
        .channel(`listing-views-${listingId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "listings",
            filter: `id=eq.${listingId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            // Обновляем счётчик при изменении
            if (payload.new && typeof payload.new.views_count === "number") {
              setViewsCount(payload.new.views_count);
            }
          }
        )
        .subscribe((status: string) => {
          setIsConnected(status === "SUBSCRIBED");
        });
    };

    setupSubscription();

    // Cleanup при размонтировании
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [listingId, enabled]);

  // Функция для ручного обновления (fallback)
  const refetch = useCallback(async () => {
    if (!listingId) return;

    const supabase = createClient();
    const { data } = await supabase
      .from("listings")
      .select("views_count")
      .eq("id", listingId)
      .single();

    if (data?.views_count !== undefined) {
      setViewsCount(data.views_count);
    }
  }, [listingId]);

  return {
    viewsCount,
    isConnected,
    refetch,
  };
}
