"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useCountnotifications, useUpdateManynotifications } from "@/lib/hooks/notifications";
import { CACHE_TIMES } from "@/lib/react-query-config";
import type { NotificationType, profiles, listings } from "@prisma/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Shape used by NotificationItem / the dropdown list. Exported here
 * instead of colocated with the list hook because both the list UI
 * and the realtime patching code need to share the type.
 */
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

// Partial-key matcher for every notifications findMany cache entry,
// regardless of the select/orderBy args the caller used. ZenStack's
// generated hooks key under ["zenstack", model, op, args, options],
// and TanStack Query v5 prefix-matches from index 0 — so this
// catches every args variant. The previous prefix was missing the
// "zenstack" segment and silently no-oped, which meant a fresh
// notification arriving via realtime never appeared in the open
// dropdown until the user manually reopened it.
const NOTIFICATIONS_FINDMANY_KEY = {
  queryKey: ["zenstack", "notifications", "findMany"],
};

// ========== CONTEXTS ==========
// The provider only exposes count + actions now. The full list is
// loaded *inside the dropdown component* via useFindManynotifications
// with enabled: open — 90% of logged-in sessions never open the
// dropdown, so fetching 50 rows + joins on every page was waste.

interface NotificationsCountContextType {
  unreadCount: number;
  hasNewNotification: boolean;
}

interface NotificationsActionsContextType {
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
}

const NotificationsCountContext = React.createContext<NotificationsCountContextType | undefined>(
  undefined
);
const NotificationsActionsContext = React.createContext<
  NotificationsActionsContextType | undefined
>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Bell-ring animation flag. Flipped true when a realtime INSERT
  // lands, cleared after 3s. Separate state because it's transient
  // UI, not data.
  const [hasNewNotification, setHasNewNotification] = React.useState(false);

  // Tiny COUNT query. No joins, no select, just a server-side integer
  // for the badge. This runs on every logged-in page — it has to be
  // cheap. staleTime keeps us from refetching on every remount.
  const { data: dbUnreadCount = 0 } = useCountnotifications(
    {
      where: {
        user_id: user?.id,
        is_read: false,
      },
    },
    {
      enabled: isAuthenticated && !!user?.id,
      ...CACHE_TIMES.NOTIFICATIONS,
    }
  );

  // Local delta applied on top of the server count so INSERT / mark-
  // as-read reflect in the badge synchronously. Reset to 0 every
  // time the authoritative dbUnreadCount changes — that's the
  // server-truth refresh, the delta has done its job and would
  // otherwise drift the badge by every realtime tick.
  const [countDelta, setCountDelta] = React.useState(0);
  const unreadCount = Math.max(0, (dbUnreadCount as number) + countDelta);
  React.useEffect(() => {
    setCountDelta(0);
  }, [dbUnreadCount]);

  // ========== REALTIME ==========
  //
  // INSERT: bump the badge locally (+1), show the bell-ring, and
  // invalidate the *count* query so it refetches on its own. The
  // findMany list is only patched if the dropdown happens to be
  // open — we do that by fetching the single new row and splicing
  // it in, not by refetching all 50.
  //
  // UPDATE: patch the findMany cache in place so is_read flips
  // without a round-trip. Count is updated locally.
  React.useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

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
          setCountDelta((d) => d + 1);
          // Schedule a real count refresh on the next tick. The local
          // delta keeps the badge synchronous; the refetch reconciles
          // the count back to the server number so deltas don't drift
          // (e.g. after several INSERT/UPDATE events the badge would
          // otherwise stay one ahead of reality until the staleTime
          // window expired).
          queryClient.invalidateQueries({ queryKey: ["zenstack", "notifications", "count"] });

          // Optional browser push if the user granted permission.
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const data = payload.new as { title?: string; message?: string };
            new Notification(data.title || "Шинэ мэдэгдэл", {
              body: data.message || "",
              icon: "/icons/notification-icon.png",
              tag: `notification-${payload.new.id}`,
            });
          }

          // Splice into any open dropdown list. We need the joins,
          // which aren't in the realtime payload — so fetch only this
          // one row (1 notification + 2 joins ≪ 50 rows + 2 joins).
          // If no list is cached (dropdown never opened), skip the
          // fetch entirely.
          const activeListQueries = queryClient
            .getQueryCache()
            .findAll({ queryKey: ["zenstack", "notifications", "findMany"] });
          if (activeListQueries.length === 0) return;

          const newId = payload.new.id as string;
          fetch(`/api/model/notifications/findUnique`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              where: { id: newId },
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
                    listing: { select: { id: true, title: true, slug: true } },
                  },
                },
              },
            }),
          })
            .then((r) => r.json())
            .then((json) => {
              const row = json?.data as NotificationWithRelations | null;
              if (!row) return;
              queryClient.setQueriesData<NotificationWithRelations[]>(
                NOTIFICATIONS_FINDMANY_KEY,
                (old) => {
                  if (!old) return old;
                  if (old.some((n) => n.id === row.id)) return old;
                  return [row, ...old];
                }
              );
            })
            .catch(() => {
              // If the findUnique fails (offline, policy, etc.), fall
              // back to a plain refetch on the currently cached list
              // queries. Rare path.
              queryClient.invalidateQueries(NOTIFICATIONS_FINDMANY_KEY);
            });
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
          // If the row flipped to is_read=true, the count is stale by
          // one. Nudge the local delta so the badge updates instantly
          // and invalidate the count query so it refetches the new
          // authoritative number; the effect above will then reset
          // delta back to 0.
          if (fresh.is_read === true) {
            setCountDelta((d) => d - 1);
            queryClient.invalidateQueries({
              queryKey: ["zenstack", "notifications", "count"],
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, queryClient]);

  // Bell-ring animation auto-clears after 3s.
  React.useEffect(() => {
    if (!hasNewNotification) return undefined;
    const timer = setTimeout(() => setHasNewNotification(false), 3000);
    return () => clearTimeout(timer);
  }, [hasNewNotification]);

  // ========== MUTATIONS ==========
  //
  // Only updateMany is used now — single-row updates are batched into
  // it via the pendingMarkIds ref below. No onSettled invalidation:
  // the cache is already in the target state before the mutation
  // fires, so invalidating would just ask for a redundant refetch.
  const updateManyNotifications = useUpdateManynotifications();

  // ========== BATCHED mark-as-read ==========
  //
  // Clicking through N unread cards used to fire N updateNotifications
  // round-trips. Now a 150ms debounce collects ids and flushes them as
  // a single updateMany. The cache is already in the target state
  // before the mutation fires (synchronous write below), so the
  // mutation's only job is persistence.
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
          // Roll back the cache rows and undo the count delta.
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
          setCountDelta((d) => d + ids.length);
        },
      }
    );
  }, [updateManyNotifications, queryClient]);

  // Flush any pending batch on unmount so "read" state is never lost
  // if the user navigates away during the debounce window.
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
      // Optimistic cache write: flip the card's is_read synchronously.
      // Returns a "did anything change" hint so we don't decrement the
      // count twice for the same id.
      let actuallyFlipped = false;
      const readAt = new Date();
      queryClient.setQueriesData<NotificationWithRelations[]>(NOTIFICATIONS_FINDMANY_KEY, (old) => {
        if (!old) return old;
        let changed = false;
        const next = old.map((n) => {
          if (n.id !== notificationId || n.is_read) return n;
          changed = true;
          actuallyFlipped = true;
          return { ...n, is_read: true, read_at: readAt };
        });
        return changed ? next : old;
      });

      // Also handle the case where the cached list isn't present
      // (dropdown never opened this session but an external actor
      // flipped is_read — shouldn't happen but defensive). In that
      // case we just always decrement; the authoritative count
      // refetch will correct any drift.
      if (actuallyFlipped || !pendingMarkIdsRef.current.has(notificationId)) {
        setCountDelta((d) => d - 1);
      }

      pendingMarkIdsRef.current.add(notificationId);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(flushMarkAsRead, 150);
    },
    [queryClient, flushMarkAsRead]
  );

  const markAllAsRead = React.useCallback(() => {
    if (!user?.id) return;

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

    // Even if the list isn't cached (dropdown never opened), we still
    // want to clear the badge instantly. Slam the delta to cancel the
    // server count.
    setCountDelta(-dbUnreadCount);

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
          setCountDelta((d) => d + dbUnreadCount);
        },
      }
    );
  }, [user, updateManyNotifications, queryClient, dbUnreadCount]);

  // ========== CONTEXT VALUES ==========

  const countValue = React.useMemo<NotificationsCountContextType>(
    () => ({ unreadCount, hasNewNotification }),
    [unreadCount, hasNewNotification]
  );

  const actionsValue = React.useMemo<NotificationsActionsContextType>(
    () => ({ markAsRead, markAllAsRead }),
    [markAsRead, markAllAsRead]
  );

  return (
    <NotificationsCountContext.Provider value={countValue}>
      <NotificationsActionsContext.Provider value={actionsValue}>
        {children}
      </NotificationsActionsContext.Provider>
    </NotificationsCountContext.Provider>
  );
}

// ========== HOOKS ==========

const DEFAULT_COUNT: NotificationsCountContextType = {
  unreadCount: 0,
  hasNewNotification: false,
};

const DEFAULT_ACTIONS: NotificationsActionsContextType = {
  markAsRead: () => {},
  markAllAsRead: () => {},
};

export function useNotificationsCount() {
  return React.useContext(NotificationsCountContext) ?? DEFAULT_COUNT;
}

export function useNotificationsActions() {
  return React.useContext(NotificationsActionsContext) ?? DEFAULT_ACTIONS;
}

/**
 * Combined hook preserved for API parity with earlier callers.
 */
export function useNotifications() {
  return { ...useNotificationsCount(), ...useNotificationsActions() };
}
