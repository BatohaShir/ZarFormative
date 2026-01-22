"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCreatedAt } from "@/app/account/me/requests/_components/utils";
import { useNotificationsActions } from "@/contexts/notifications-context";
import type { NotificationWithRelations } from "@/contexts/notifications-context";
import {
  CheckCircle,
  XCircle,
  Play,
  Flag,
  Bell,
  Clock,
  UserPlus,
  User,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";

// Иконки по типу уведомления
const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  request_accepted: CheckCircle,
  request_rejected: XCircle,
  work_started: Play,
  work_completed: Flag,
  cancelled_by_provider: XCircle,
  request_expired: AlertTriangle,
  new_request: UserPlus,
  request_cancelled: XCircle,
  work_reminder: Clock,
  new_message: MessageCircle,
};

// Цвета по типу
const NOTIFICATION_COLORS: Record<string, string> = {
  request_accepted: "text-green-500 bg-green-100 dark:bg-green-900/30",
  request_rejected: "text-red-500 bg-red-100 dark:bg-red-900/30",
  work_started: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
  work_completed: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
  cancelled_by_provider: "text-red-500 bg-red-100 dark:bg-red-900/30",
  request_expired: "text-red-500 bg-red-100 dark:bg-red-900/30",
  new_request: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
  request_cancelled: "text-orange-500 bg-orange-100 dark:bg-orange-900/30",
  work_reminder: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
  new_message: "text-purple-500 bg-purple-100 dark:bg-purple-900/30",
};

interface NotificationItemProps {
  notification: NotificationWithRelations;
  onClick?: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { markAsRead } = useNotificationsActions();
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
  const colorClasses = NOTIFICATION_COLORS[notification.type] || "text-muted-foreground bg-muted";

  // Build link based on notification type and request
  // For new_message notifications, add openChat param to open chat modal directly
  const href = notification.request_id
    ? notification.type === "new_message"
      ? `/account/me/requests?highlight=${notification.request_id}&openChat=true`
      : `/account/me/requests?highlight=${notification.request_id}`
    : "/account/me/requests";

  const handleClick = () => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    onClick?.();
  };

  // Get actor name
  const actorName = notification.actor
    ? notification.actor.is_company && notification.actor.company_name
      ? notification.actor.company_name
      : [notification.actor.first_name, notification.actor.last_name].filter(Boolean).join(" ") || "Хэрэглэгч"
    : null;

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "flex gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0",
        !notification.is_read && "bg-primary/5"
      )}
    >
      {/* Icon or Actor Avatar */}
      <div className="shrink-0">
        {notification.actor?.avatar_url ? (
          <div className="relative">
            <Image
              src={notification.actor.avatar_url}
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
              unoptimized={notification.actor.avatar_url.includes("dicebear")}
            />
            {/* Small icon overlay */}
            <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center", colorClasses)}>
              <Icon className="h-3 w-3" />
            </div>
          </div>
        ) : (
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", colorClasses)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm line-clamp-2",
          !notification.is_read && "font-medium"
        )}>
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">
            {formatCreatedAt(notification.created_at)}
          </p>
          {actorName && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <User className="h-3 w-3" />
                {actorName}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="shrink-0 self-center">
          <div className="w-2 h-2 rounded-full bg-primary" />
        </div>
      )}
    </Link>
  );
}
