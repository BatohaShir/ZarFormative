"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
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
  const { unreadCount, hasNewNotification } = useNotificationsCount();
  const { markAllAsRead, isMarking } = useNotificationsActions();
  const { notifications, isLoading } = useNotificationsData();

  // Take only recent 5 for dropdown
  const recentNotifications = notifications.slice(0, 5);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${className}`}>
          <Bell className={`h-5 w-5 ${hasNewNotification ? "animate-[bell-ring_0.5s_ease-in-out]" : ""}`} />
          {unreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center leading-none ${hasNewNotification ? "animate-pulse" : ""}`}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <span className="font-medium text-sm">Мэдэгдэл</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => markAllAsRead()}
              disabled={isMarking}
            >
              {isMarking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Бүгдийг уншсан
                </>
              )}
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center">
              <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Ачааллаж байна...</p>
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Мэдэгдэл байхгүй</p>
            </div>
          ) : (
            recentNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => setOpen(false)}
              />
            ))
          )}
        </div>

        {/* Footer - link to full page */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <Link
              href="/account/me/notifications"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-center text-sm text-primary hover:bg-muted/50 transition-colors"
            >
              Бүх мэдэгдэл харах ({notifications.length})
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
