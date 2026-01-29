"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck, Loader2, ChevronRight } from "lucide-react";
import {
  useNotificationsCount,
  useNotificationsActions,
  useNotificationsData,
} from "@/contexts/notifications-context";
import { NotificationItem } from "./notification-item";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const { resolvedTheme } = useTheme();
  const { unreadCount, hasNewNotification } = useNotificationsCount();
  const { markAllAsRead, isMarking } = useNotificationsActions();
  const { notifications, isLoading } = useNotificationsData();

  const isDark = resolvedTheme === "dark";

  // Take only recent 5 for dropdown
  const recentNotifications = notifications.slice(0, 5);

  // Add class to wrapper for mobile centering
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const wrapper = document.querySelector('[data-radix-popper-content-wrapper]');
        if (wrapper) {
          wrapper.classList.add('notification-dropdown-wrapper');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${className}`}>
          <Bell className={`h-5 w-5 ${hasNewNotification ? "animate-[bell-ring_0.5s_ease-in-out]" : ""}`} />
          {unreadCount > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none shadow-sm ${hasNewNotification ? "animate-pulse" : ""}`}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={`w-[calc(100vw-32px)] max-w-95 p-0 rounded-2xl shadow-2xl border-0 overflow-hidden ${
          isDark
            ? "bg-linear-to-b from-slate-900 to-slate-950"
            : "bg-white border border-gray-200"
        }`}
        sideOffset={20}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isDark ? "border-white/10" : "border-gray-100"
        }`}>
          <h3 className={`font-semibold text-base ${isDark ? "text-white" : "text-gray-900"}`}>
            Мэдэгдэл
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              disabled={isMarking}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {isMarking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Бүгдийг уншсан</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-105 overflow-y-auto scrollbar-hide">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${
                isDark ? "bg-slate-800" : "bg-gray-100"
              }`}>
                <Loader2 className={`h-6 w-6 animate-spin ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              </div>
              <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                Ачааллаж байна...
              </p>
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="p-10 text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isDark ? "bg-slate-800/50" : "bg-gray-100"
              }`}>
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
                  onClick={() => setOpen(false)}
                  variant={isDark ? "dark" : "light"}
                  inDropdown
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer - link to full page */}
        {notifications.length > 0 && (
          <div className={`border-t ${isDark ? "border-white/10" : "border-gray-100"}`}>
            <Link
              href="/account/me/notifications"
              onClick={() => setOpen(false)}
              className={`flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors ${
                isDark
                  ? "text-slate-400 hover:text-white hover:bg-white/5"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span>Бүх мэдэгдэл харах</span>
              <span className={`px-1.5 py-0.5 rounded-md text-xs ${
                isDark ? "bg-slate-800" : "bg-gray-100 text-gray-600"
              }`}>
                {notifications.length}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
