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
  actor?: Pick<profiles, "id" | "first_name" | "last_name" | "avatar_url" | "company_name" | "is_company"> | null;
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
}

// Контекст 3: Полные данные
interface NotificationsDataContextType {
  notifications: NotificationWithRelations[];
  isLoading: boolean;
  refetch: () => void;
}

const NotificationsCountContext = React.createContext<NotificationsCountContextType | undefined>(undefined);
const NotificationsActionsContext = React.createContext<NotificationsActionsContextType | undefined>(undefined);
const NotificationsDataContext = React.createContext<NotificationsDataContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Optimistic state для мгновенного UI
  const [optimisticReadIds, setOptimisticReadIds] = React.useState<Set<string>>(new Set());

  // State для отслеживания новых уведомлений (для анимации)
  const [hasNewNotification, setHasNewNotification] = React.useState(false);
  const prevUnreadCountRef = React.useRef<number>(0);

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
      refetchInterval: 10000, // Fallback polling каждые 10 секунд (если realtime не работает)
    }
  );

  // ========== SUPABASE REALTIME SUBSCRIPTION ==========
  // Подписка на новые уведомления для моментального обновления UI
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
            // Новое уведомление пришло - немедленно рефетчим для получения полных данных с relations
            console.log("[Notifications] New notification received via realtime:", payload.new);

            // Показываем анимацию нового уведомления
            setHasNewNotification(true);

            // Пробуем показать браузерное уведомление если есть разрешение
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              const data = payload.new as { title?: string; message?: string };
              new Notification(data.title || "Шинэ мэдэгдэл", {
                body: data.message || "",
                icon: "/icons/notification-icon.png",
                tag: "notification-" + Date.now(),
              });
            }

            refetch();
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
          () => {
            // Уведомление обновлено (например, прочитано с другого устройства)
            refetch();
          }
        )
        .subscribe((status: string) => {
          console.log("[Notifications] Realtime subscription status:", status);
        });
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        console.log("[Notifications] Unsubscribing from realtime channel");
        supabase.removeChannel(channel);
      }
    };
  }, [isAuthenticated, user?.id, refetch]);

  // Сбрасываем флаг новых уведомлений через 3 секунды
  React.useEffect(() => {
    if (hasNewNotification) {
      const timer = setTimeout(() => {
        setHasNewNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasNewNotification]);

  // Мутации
  const updateNotification = useUpdatenotifications({
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const updateManyNotifications = useUpdateManynotifications({
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Применяем optimistic updates к данным
  const notifications = React.useMemo(() => {
    return (dbNotifications as NotificationWithRelations[]).map((n) => ({
      ...n,
      is_read: n.is_read || optimisticReadIds.has(n.id),
    }));
  }, [dbNotifications, optimisticReadIds]);

  // Подсчёт непрочитанных
  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const totalCount = notifications.length;

  // Ref для стабильных callbacks
  const notificationsRef = React.useRef(notifications);
  notificationsRef.current = notifications;

  // Mark single notification as read
  const markAsRead = React.useCallback(
    (notificationId: string) => {
      // Optimistic update
      setOptimisticReadIds((prev) => new Set(prev).add(notificationId));

      // Background sync
      updateNotification.mutate({
        where: { id: notificationId },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });
    },
    [updateNotification]
  );

  // Mark all as read
  const markAllAsRead = React.useCallback(() => {
    if (!user?.id) return;

    // Optimistic: mark all unread as read
    const unreadIds = notificationsRef.current.filter((n) => !n.is_read).map((n) => n.id);
    setOptimisticReadIds((prev) => new Set([...prev, ...unreadIds]));

    // Background sync
    updateManyNotifications.mutate({
      where: {
        user_id: user.id,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }, [user?.id, updateManyNotifications]);

  // ========== МЕМОИЗИРОВАННЫЕ ЗНАЧЕНИЯ ==========

  const countValue = React.useMemo<NotificationsCountContextType>(
    () => ({
      unreadCount,
      totalCount,
      hasNewNotification,
    }),
    [unreadCount, totalCount, hasNewNotification]
  );

  const actionsValue = React.useMemo<NotificationsActionsContextType>(
    () => ({
      markAsRead,
      markAllAsRead,
      isMarking: updateNotification.isPending || updateManyNotifications.isPending,
    }),
    [markAsRead, markAllAsRead, updateNotification.isPending, updateManyNotifications.isPending]
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
