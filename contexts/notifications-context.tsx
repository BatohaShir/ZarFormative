"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  useFindManynotifications,
  useUpdatenotifications,
  useUpdateManynotifications,
} from "@/lib/hooks/notifications";
import { CACHE_TIMES } from "@/lib/react-query-config";
import type { NotificationType, profiles, listings } from "@prisma/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Тип для уведомления с relations
export interface NotificationWithRelations {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  request_id: string | null;
  actor_id: string | null;
  created_at: Date;
  read_at: Date | null;
  actor?: Pick<
    profiles,
    "id" | "first_name" | "last_name" | "avatar_url" | "company_name" | "is_company" | "is_verified"
  > | null;
  request?: {
    id: string;
    listing: Pick<listings, "id" | "title" | "slug">;
  } | null;
}

// ========== РАЗДЕЛЁННЫЕ КОНТЕКСТЫ ==========
// 1. NotificationsCountContext - для badge (количество непрочитанных)
// 2. NotificationsActionsContext - для markAsRead/markAllAsRead
// 3. NotificationsDataContext - для списка уведомлений

// Контекст 1: Только count для badge
interface NotificationsCountContextType {
  unreadCount: number;
  totalCount: number;
  hasNewNotification: boolean; // Для анимации badge
}

// Контекст 2: Действия
interface NotificationsActionsContextType {
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  isMarking: boolean;
  isMarkingAll: boolean; // Separate flag for "mark all" operation
}

// Контекст 3: Полные данные
interface NotificationsDataContextType {
  notifications: NotificationWithRelations[];
  isLoading: boolean;
  refetch: () => void;
}

const NotificationsCountContext = React.createContext<NotificationsCountContextType | undefined>(
  undefined
);
const NotificationsActionsContext = React.createContext<
  NotificationsActionsContextType | undefined
>(undefined);
const NotificationsDataContext = React.createContext<NotificationsDataContextType | undefined>(
  undefined
);

// Any notifications findMany cache entry, regardless of select/orderBy
// args. We surgically patch every matching cache slot instead of
// invalidating the whole ["notifications"] key — invalidation kicks
// off a full findMany + 2 joins round-trip (~2s from MN→Seoul) on
// every mark-as-read, and we already know exactly what to change.
const NOTIFICATIONS_FINDMANY_KEY = { queryKey: ["notifications", "findMany"] };

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // State для отслеживания новых уведомлений (для анимации)
  const [hasNewNotification, setHasNewNotification] = React.useState(false);

  // Загрузка уведомлений из БД
  const {
    data: dbNotifications = [],
    isLoading,
    refetch,
  } = useFindManynotifications(
    {
      where: {
        user_id: user?.id,
      },
      select: {
        id: true,
        user_id: true,
        type: true,
        title: true,
        message: true,
        is_read: true,
        request_id: true,
        actor_id: true,
        created_at: true,
        read_at: true,
        actor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
            company_name: true,
            is_company: true,
            is_verified: true,
          },
        },
        request: {
          select: {
            id: true,
            listing: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 50, // Ограничиваем для производительности
    },
    {
      enabled: isAuthenticated && !!user?.id,
      ...CACHE_TIMES.NOTIFICATIONS,
      // OPTIMIZATION: Убран polling - используем только Supabase Realtime
      // refetchInterval убран для уменьшения нагрузки на БД
    }
  );

  // Stable ref for refetch to avoid subscription thrashing
  // (refetch changes identity on every query result, causing useEffect to re-run)
  const refetchRef = React.useRef(refetch);
  React.useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // ========== SUPABASE REALTIME SUBSCRIPTION ==========
  //
  // INSERT: still refetches once, because the realtime payload doesn't
  // include the actor/listing joins we render in the dropdown. New
  // notifications are rare enough that one round-trip per arrival is
  // fine — the badge flips instantly, the card fills in shortly after.
  //
  // UPDATE: patched directly into every notifications findMany cache
  // entry. The common case is mark-as-read, which happens on every
  // dropdown interaction — hitting the server again for data we just
  // told the server to change would be silly.
  React.useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            setHasNewNotification(true);

            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              const data = payload.new as { title?: string; message?: string };
              new Notification(data.title || "Шинэ мэдэгдэл", {
                body: data.message || "",
                icon: "/icons/notification-icon.png",
                tag: "notification-" + Date.now(),
              });
            }

            refetchRef.current();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            // Patch in place. If our own optimistic cache write already
            // flipped is_read to true, this is a no-op — the values
            // match and React Query's structural sharing skips the
            // re-render.
            const fresh = payload.new as Partial<NotificationWithRelations> & { id: string };
            queryClient.setQueriesData<NotificationWithRelations[]>(
              NOTIFICATIONS_FINDMANY_KEY,
              (old) => {
                if (!old) return old;
                let changed = false;
                const next = old.map((n) => {
                  if (n.id !== fresh.id) return n;
                  changed = true;
                  return { ...n, ...fresh };
                });
                return changed ? next : old;
              }
            );
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAuthenticated, user?.id, queryClient]);

  // Сбрасываем флаг новых уведомлений через 3 секунды
  React.useEffect(() => {
    if (hasNewNotification) {
      const timer = setTimeout(() => {
        setHasNewNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [hasNewNotification]);

  // Мутации. No onSettled invalidate — we already write the target
  // state into the cache before the mutation fires, and realtime
  // patches from other tabs / server-side actors keep us honest.
  // Invalidating here would kick off a redundant findMany that we've
  // spent the rest of this file avoiding.
  const updateNotification = useUpdatenotifications();
  const updateManyNotifications = useUpdateManynotifications();

  const notifications = dbNotifications as NotificationWithRelations[];

  // Подсчёт непрочитанных. Cheap for a 50-item list, so we don't
  // bother with a denormalized counter — a single pass on re-render
  // is measured in microseconds.
  const unreadCount = React.useMemo(
    () => notifications.reduce((n, x) => n + (x.is_read ? 0 : 1), 0),
    [notifications]
  );

  const totalCount = notifications.length;

  // ========== BATCHED mark-as-read ==========
  //
  // The old path fired one REST updateNotification per card the user
  // glanced at. Opening a dropdown with 5 unread and clicking through
  // burned 5 round-trips. Now we collect ids for 150ms after the
  // first mark and flush them as a single updateMany — the UI is
  // already optimistic (the cache flip happens synchronously below),
  // the server just needs one call to catch up.
  const pendingMarkIdsRef = React.useRef<Set<string>>(new Set());
  const flushTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushMarkAsRead = React.useCallback(() => {
    flushTimerRef.current = null;
    const ids = Array.from(pendingMarkIdsRef.current);
    if (ids.length === 0) return;
    pendingMarkIdsRef.current = new Set();

    updateManyNotifications.mutate(
      {
        where: { id: { in: ids } },
        data: { is_read: true, read_at: new Date() },
      },
      {
        onError: () => {
          // Roll back: re-flag the cards as unread in the cache.
          queryClient.setQueriesData<NotificationWithRelations[]>(
            NOTIFICATIONS_FINDMANY_KEY,
            (old) => {
              if (!old) return old;
              const idSet = new Set(ids);
              return old.map((n) =>
                idSet.has(n.id) ? { ...n, is_read: false, read_at: null } : n
              );
            }
          );
        },
      }
    );
  }, [updateManyNotifications, queryClient]);

  // Flush any pending batch on unmount so "read" state doesn't get
  // dropped if the user navigates away within the debounce window.
  React.useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushMarkAsRead();
      }
    };
  }, [flushMarkAsRead]);

  const markAsRead = React.useCallback(
    (notificationId: string) => {
      // Optimistic: write straight into every findMany cache. No
      // component-local "optimisticIds" Set that grows forever — the
      // cache is the source of truth and the realtime UPDATE echo
      // patches the same row later (a no-op by then).
      const readAt = new Date();
      queryClient.setQueriesData<NotificationWithRelations[]>(NOTIFICATIONS_FINDMANY_KEY, (old) => {
        if (!old) return old;
        let changed = false;
        const next = old.map((n) => {
          if (n.id !== notificationId || n.is_read) return n;
          changed = true;
          return { ...n, is_read: true, read_at: readAt };
        });
        return changed ? next : old;
      });

      // Batch: collect id, flush after a short debounce.
      pendingMarkIdsRef.current.add(notificationId);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(flushMarkAsRead, 150);
    },
    [queryClient, flushMarkAsRead]
  );

  const markAllAsRead = React.useCallback(() => {
    if (!user?.id) return;

    // Optimistic: flip every unread card's is_read in the cache.
    const now = new Date();
    const snapshotUnreadIds: string[] = [];
    queryClient.setQueriesData<NotificationWithRelations[]>(NOTIFICATIONS_FINDMANY_KEY, (old) => {
      if (!old) return old;
      let changed = false;
      const next = old.map((n) => {
        if (n.is_read) return n;
        changed = true;
        snapshotUnreadIds.push(n.id);
        return { ...n, is_read: true, read_at: now };
      });
      return changed ? next : old;
    });
    if (snapshotUnreadIds.length === 0) return;

    updateManyNotifications.mutate(
      {
        where: { user_id: user.id, is_read: false },
        data: { is_read: true, read_at: now },
      },
      {
        onError: () => {
          queryClient.setQueriesData<NotificationWithRelations[]>(
            NOTIFICATIONS_FINDMANY_KEY,
            (old) => {
              if (!old) return old;
              const idSet = new Set(snapshotUnreadIds);
              return old.map((n) =>
                idSet.has(n.id) ? { ...n, is_read: false, read_at: null } : n
              );
            }
          );
        },
      }
    );
  }, [user, updateManyNotifications, queryClient]);

  // ========== МЕМОИЗИРОВАННЫЕ ЗНАЧЕНИЯ ==========

  const countValue = React.useMemo<NotificationsCountContextType>(
    () => ({
      unreadCount,
      totalCount,
      hasNewNotification,
    }),
    [unreadCount, totalCount, hasNewNotification]
  );

  // isMarking / isMarkingAll are preserved for API back-compat but
  // always false now: both mark-as-read flows are synchronous at the
  // cache level. Callers that still pass these to a disabled prop end
  // up with a button that's always enabled, which is what we want —
  // there is no work to wait on.
  const actionsValue = React.useMemo<NotificationsActionsContextType>(
    () => ({
      markAsRead,
      markAllAsRead,
      isMarking: false,
      isMarkingAll: false,
    }),
    [markAsRead, markAllAsRead]
  );

  const dataValue = React.useMemo<NotificationsDataContextType>(
    () => ({
      notifications,
      isLoading,
      refetch,
    }),
    [notifications, isLoading, refetch]
  );

  return (
    <NotificationsCountContext.Provider value={countValue}>
      <NotificationsActionsContext.Provider value={actionsValue}>
        <NotificationsDataContext.Provider value={dataValue}>
          {children}
        </NotificationsDataContext.Provider>
      </NotificationsActionsContext.Provider>
    </NotificationsCountContext.Provider>
  );
}

// ========== ХУКИ ==========

// Дефолтные значения для случаев без провайдера (гости, загрузка)
const DEFAULT_COUNT: NotificationsCountContextType = {
  unreadCount: 0,
  totalCount: 0,
  hasNewNotification: false,
};

const DEFAULT_ACTIONS: NotificationsActionsContextType = {
  markAsRead: () => {},
  markAllAsRead: () => {},
  isMarking: false,
  isMarkingAll: false,
};

const DEFAULT_DATA: NotificationsDataContextType = {
  notifications: [],
  isLoading: false,
  refetch: () => {},
};

/**
 * Хук для badge - только count
 * Возвращает дефолтные значения если нет провайдера (для гостей)
 */
export function useNotificationsCount() {
  const context = React.useContext(NotificationsCountContext);
  return context ?? DEFAULT_COUNT;
}

/**
 * Хук для действий
 * Возвращает no-op функции если нет провайдера
 */
export function useNotificationsActions() {
  const context = React.useContext(NotificationsActionsContext);
  return context ?? DEFAULT_ACTIONS;
}

/**
 * Хук для полного списка
 * Возвращает пустой массив если нет провайдера
 */
export function useNotificationsData() {
  const context = React.useContext(NotificationsDataContext);
  return context ?? DEFAULT_DATA;
}

/**
 * Комбинированный хук
 */
export function useNotifications() {
  const count = useNotificationsCount();
  const actions = useNotificationsActions();
  const data = useNotificationsData();

  return {
    ...count,
    ...actions,
    ...data,
  };
}
