"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface LocationData {
  id: string;
  request_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  is_active: boolean;
  updated_at: string;
}

interface UseRealtimeLocationOptions {
  requestId: string;
  enabled?: boolean;
}

/**
 * Хук для real-time отслеживания локаций участников заявки
 * Использует Supabase Realtime для мгновенных обновлений
 */
export function useRealtimeLocation({ requestId, enabled = true }: UseRealtimeLocationOptions) {
  const [locations, setLocations] = useState<Map<string, LocationData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка начальных локаций
  const loadInitialLocations = useCallback(async () => {
    if (!enabled || !requestId) return;

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("request_locations")
        .select("*")
        .eq("request_id", requestId)
        .eq("is_active", true);

      if (fetchError) throw fetchError;

      const newLocations = new Map<string, LocationData>();
      (data || []).forEach((loc: LocationData) => {
        newLocations.set(loc.user_id, loc);
      });
      setLocations(newLocations);
    } catch (err) {
      console.error("Error loading locations:", err);
      setError("Байршил ачаалахад алдаа гарлаа");
    } finally {
      setIsLoading(false);
    }
  }, [requestId, enabled]);

  // Загрузка при mount
  useEffect(() => {
    loadInitialLocations();
  }, [loadInitialLocations]);

  // Подписка на realtime обновления
  useEffect(() => {
    if (!enabled || !requestId) return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    channel = supabase
      .channel(`request_locations:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_locations",
          filter: `request_id=eq.${requestId}`,
        },
        (payload: { eventType: string; new: LocationData; old: LocationData }) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newLoc = payload.new as LocationData;
            setLocations((prev) => {
              const updated = new Map(prev);
              if (newLoc.is_active) {
                updated.set(newLoc.user_id, newLoc);
              } else {
                updated.delete(newLoc.user_id);
              }
              return updated;
            });
          } else if (payload.eventType === "DELETE") {
            const oldLoc = payload.old as LocationData;
            setLocations((prev) => {
              const updated = new Map(prev);
              updated.delete(oldLoc.user_id);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [requestId, enabled]);

  // Получить локацию конкретного пользователя
  const getLocationByUserId = useCallback(
    (userId: string): LocationData | undefined => {
      return locations.get(userId);
    },
    [locations]
  );

  // Получить все активные локации как массив
  const activeLocations = Array.from(locations.values());

  return {
    locations,
    activeLocations,
    getLocationByUserId,
    isLoading,
    error,
    refetch: loadInitialLocations,
  };
}
