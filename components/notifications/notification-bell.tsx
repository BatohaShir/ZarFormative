"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  useNotificationsCount,
  useNotificationsActions,
  type NotificationWithRelations,
} from "@/contexts/notifications-context";
import { useFindManynotifications } from "@/lib/hooks/notifications";
import { useAuth } from "@/contexts/auth-context";
import { CACHE_TIMES } from "@/lib/react-query-config";
import { NotificationItem } from "./notification-item";

interface NotificationBellProps {
  className?: string;
}

/**
 * Dropdown content. Only mounts when the dropdown is open, so the
 * full notifications list (with actor / listing joins) is never
 * fetched on pages where the user doesn't open the bell. This is the
 * whole point of lazy-loading it here instead of in the provider.
 */
function NotificationDropdownContent({
  isDark,
  onClose,
}: {
  isDark: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { markAllAsRead } = useNotificationsActions();
  const { unreadCount } = useNotificationsCount();

  const { data: rawNotifications = [], isLoading } = useFindManynotifications(
    {
      where: { user_id: user?.id },
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
      orderBy: { created_at: "desc" },
      take: 20,
    },
    {
      enabled: !!user?.id,
      ...CACHE_TIMES.NOTIFICATIONS,
    }
  );

  const notifications = rawNotifications as NotificationWithRelations[];
  const recentNotifications = notifications.slice(0, 5);

  return (
    <>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-5 py-4 border-b ${
          isDark ? "border-white/10" : "border-gray-100"
        }`}
      >
        <h3 className={`font-semibold text-base ${isDark ? "text-white" : "text-gray-900"}`}>
          Мэдэгдэл
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Бүгдийг уншсан</span>
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-105 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="p-8 text-center">
            <div
              className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${
                isDark ? "bg-slate-800" : "bg-gray-100"
              }`}
            >
              <Loader2
                className={`h-6 w-6 animate-spin ${isDark ? "text-slate-500" : "text-gray-400"}`}
              />
            </div>
            <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              Ачааллаж байна...
            </p>
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="p-10 text-center">
            <div
              className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isDark ? "bg-slate-800/50" : "bg-gray-100"
              }`}
            >
              <Bell className={`h-8 w-8 ${isDark ? "text-slate-600" : "text-gray-400"}`} />
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Мэдэгдэл байхгүй
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-600" : "text-gray-400"}`}>
              Шинэ мэдэгдэл ирэхэд энд харагдана
            </p>
          </div>
        ) : (
          <div className="py-2">
            {recentNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={onClose}
                variant={isDark ? "dark" : "light"}
                inDropdown
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer — showing the 5 most recent. If more exist, make it
          visible so users know they haven't seen all of them. The
          previous "Бүх мэдэгдэл харах" link pointed at
          /account/me/notifications, which is the *settings* page —
          a broken navigation we've removed. When a dedicated full
          list view lands, drop a link here. */}
      {notifications.length > 5 && (
        <div
          className={`border-t px-5 py-3 text-center text-xs ${
            isDark ? "border-white/10 text-slate-500" : "border-gray-100 text-gray-500"
          }`}
        >
          Сүүлийн 5 мэдэгдэл
        </div>
      )}
    </>
  );
}

/**
 * NotificationBell — subscribes only to Count context for the badge.
 * Data context is loaded lazily inside the dropdown when opened.
 */
export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const { resolvedTheme } = useTheme();
  const { unreadCount, hasNewNotification } = useNotificationsCount();

  const isDark = resolvedTheme === "dark";
  const hasUnread = unreadCount > 0;

  const handleClose = React.useCallback(() => setOpen(false), []);

  // Add class to wrapper for mobile centering
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const wrapper = document.querySelector("[data-radix-popper-content-wrapper]");
        if (wrapper) {
          wrapper.classList.add("notification-dropdown-wrapper");
        }
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${className}`}>
          <Bell
            className={`h-5 w-5 ${hasUnread ? "fill-amber-400 text-amber-500" : ""} ${
              hasNewNotification
                ? "animate-[bell-ring_0.5s_ease-in-out]"
                : hasUnread
                  ? "animate-bell-wobble"
                  : ""
            }`}
          />
          {hasUnread && (
            <span
              className={`absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none shadow-sm ${hasNewNotification ? "animate-pulse" : ""}`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={`w-[calc(100vw-32px)] max-w-95 p-0 rounded-2xl shadow-2xl border-0 overflow-hidden ${
          isDark ? "bg-linear-to-b from-slate-900 to-slate-950" : "bg-white border border-gray-200"
        }`}
        sideOffset={20}
      >
        {/* Data context loaded only when dropdown is open */}
        <NotificationDropdownContent isDark={isDark} onClose={handleClose} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
