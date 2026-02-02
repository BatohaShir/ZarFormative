"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Хук для real-time синхронизации данных профиля
 *
 * Что он делает:
 * 1. Подписывается на изменения профиля в БД через Supabase Realtime
 * 2. При изменении данных (рейтинг, отзывы, и т.д.) автоматически обновляет UI
 * 3. Также подписывается на изменения образования и опыта работы
 *
 * Это важно для:
 * - Мгновенного обновления рейтинга когда клиент оставляет отзыв
 * - Синхронизации данных между вкладками браузера
 * - Обновления статистики (completed_jobs_count) при завершении заказов
 */
export function useRealtimeProfile(userId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Используем переданный userId или ID текущего пользователя
  const targetUserId = userId || user?.id;

  // Функция для инвалидации кэша профиля
  // invalidateQueries говорит React Query что данные устарели и нужно перезагрузить
  const refetchProfile = useCallback(() => {
    if (!targetUserId) return;

    console.log("[useRealtimeProfile] Invalidating profile cache for user:", targetUserId);

    // Инвалидируем запрос профиля
    queryClient.invalidateQueries({
      queryKey: ["profiles", "findUnique", { where: { id: targetUserId } }],
    });

    // Также обновляем активные запросы немедленно
    queryClient.refetchQueries({
      queryKey: ["profiles"],
      type: "active",
    });
  }, [queryClient, targetUserId]);

  // Функция для инвалидации образования
  const refetchEducations = useCallback(() => {
    if (!targetUserId) return;

    console.log("[useRealtimeProfile] Invalidating educations cache");

    queryClient.invalidateQueries({
      queryKey: ["profiles_educations"],
    });
  }, [queryClient, targetUserId]);

  // Функция для инвалидации опыта работы
  const refetchWorkExperiences = useCallback(() => {
    if (!targetUserId) return;

    console.log("[useRealtimeProfile] Invalidating work experiences cache");

    queryClient.invalidateQueries({
      queryKey: ["profiles_work_experiences"],
    });
  }, [queryClient, targetUserId]);

  useEffect(() => {
    // Не подписываемся если нет userId
    if (!targetUserId) return;

    const supabase = createClient();

    console.log("[useRealtimeProfile] Setting up realtime subscriptions for user:", targetUserId);

    // Создаём канал для подписки на изменения
    // Канал - это "комната" в которой мы получаем события
    const channel = supabase
      .channel(`profile-${targetUserId}`)
      // Подписка на изменения профиля
      .on(
        "postgres_changes",
        {
          event: "*", // Слушаем все события (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "profiles",
          filter: `id=eq.${targetUserId}`, // Только для нашего пользователя
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log("[useRealtimeProfile] Profile changed:", payload.eventType);
          refetchProfile();
        }
      )
      // Подписка на изменения образования
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles_educations",
          filter: `user_id=eq.${targetUserId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log("[useRealtimeProfile] Education changed:", payload.eventType);
          refetchEducations();
        }
      )
      // Подписка на изменения опыта работы
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles_work_experiences",
          filter: `user_id=eq.${targetUserId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log("[useRealtimeProfile] Work experience changed:", payload.eventType);
          refetchWorkExperiences();
        }
      )
      .subscribe((status: string, err?: Error) => {
        console.log("[useRealtimeProfile] Subscription status:", status);
        if (err) {
          console.error("[useRealtimeProfile] Subscription error:", err);
        }
        if (status === "SUBSCRIBED") {
          console.log("[useRealtimeProfile] Successfully subscribed to profile changes");
        }
      });

    // Cleanup функция - вызывается когда компонент размонтируется
    // или когда userId меняется
    return () => {
      console.log("[useRealtimeProfile] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [targetUserId, refetchProfile, refetchEducations, refetchWorkExperiences]);

  // Возвращаем функции для ручного обновления если нужно
  return {
    refetchProfile,
    refetchEducations,
    refetchWorkExperiences,
  };
}
