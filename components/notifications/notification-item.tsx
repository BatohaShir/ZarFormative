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

// Цвета для светлой темы
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

// Цвета для тёмной темы dropdown
const NOTIFICATION_COLORS_DARK: Record<string, string> = {
  request_accepted: "text-green-400 bg-green-500/20",
  request_rejected: "text-red-400 bg-red-500/20",
  work_started: "text-blue-400 bg-blue-500/20",
  work_completed: "text-emerald-400 bg-emerald-500/20",
  cancelled_by_provider: "text-red-400 bg-red-500/20",
  request_expired: "text-red-400 bg-red-500/20",
  new_request: "text-blue-400 bg-blue-500/20",
  request_cancelled: "text-orange-400 bg-orange-500/20",
  work_reminder: "text-amber-400 bg-amber-500/20",
  new_message: "text-purple-400 bg-purple-500/20",
};

interface NotificationItemProps {
  notification: NotificationWithRelations;
  onClick?: () => void;
  variant?: "light" | "dark";
  /** Used in dropdown - compact style without rounded corners */
  inDropdown?: boolean;
}

export function NotificationItem({ notification, onClick, variant = "light", inDropdown = false }: NotificationItemProps) {
  const { markAsRead } = useNotificationsActions();
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
  const colorClasses = variant === "dark"
    ? NOTIFICATION_COLORS_DARK[notification.type] || "text-slate-400 bg-slate-700/50"
    : NOTIFICATION_COLORS[notification.type] || "text-muted-foreground bg-muted";

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

  // Dark variant (для dropdown)
  if (variant === "dark") {
    return (
      <Link
        href={href}
        onClick={handleClick}
        className={cn(
          "flex gap-3.5 px-5 py-3.5 transition-all duration-200 group relative",
          "hover:bg-white/5",
          !notification.is_read && "bg-white/3"
        )}
      >
        {/* Icon or Actor Avatar */}
        <div className="shrink-0 relative">
          {notification.actor?.avatar_url ? (
            <div className="relative">
              <Image
                src={notification.actor.avatar_url}
                alt=""
                width={44}
                height={44}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10"
                unoptimized={notification.actor.avatar_url.includes("dicebear")}
              />
              {/* Small icon overlay */}
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-slate-900",
                colorClasses
              )}>
                <Icon className="h-2.5 w-2.5" />
              </div>
            </div>
          ) : (
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center",
              colorClasses
            )}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <p className={cn(
            "text-sm leading-snug line-clamp-2",
            !notification.is_read ? "text-white font-medium" : "text-slate-300"
          )}>
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-xs text-slate-500">
              {formatCreatedAt(notification.created_at)}
            </p>
            {actorName && (
              <>
                <span className="text-slate-700">•</span>
                <p className="text-xs text-slate-500 truncate flex items-center gap-1">
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
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
          </div>
        )}
      </Link>
    );
  }

  // Light variant (для страницы уведомлений или светлого dropdown)
  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "flex gap-3.5 transition-all duration-200 group",
        inDropdown
          ? cn(
              "px-5 py-3.5",
              "hover:bg-gray-50",
              !notification.is_read && "bg-blue-50/50"
            )
          : cn(
              "px-4 py-3.5 rounded-xl",
              "hover:bg-muted/70 hover:shadow-sm",
              !notification.is_read && "bg-primary/5 shadow-sm"
            )
      )}
    >
      {/* Icon or Actor Avatar */}
      <div className="shrink-0">
        {notification.actor?.avatar_url ? (
          <div className="relative">
            <Image
              src={notification.actor.avatar_url}
              alt=""
              width={inDropdown ? 44 : 48}
              height={inDropdown ? 44 : 48}
              className={cn(
                "rounded-full object-cover ring-2",
                inDropdown ? "w-11 h-11 ring-gray-200" : "w-12 h-12 ring-border"
              )}
              unoptimized={notification.actor.avatar_url.includes("dicebear")}
            />
            {/* Small icon overlay */}
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2",
              inDropdown ? "ring-white" : "ring-background",
              colorClasses
            )}>
              <Icon className="h-2.5 w-2.5" />
            </div>
          </div>
        ) : (
          <div className={cn(
            "rounded-full flex items-center justify-center",
            inDropdown ? "w-11 h-11" : "w-12 h-12",
            colorClasses
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0", inDropdown && "pr-4")}>
        <p className={cn(
          "text-sm leading-snug line-clamp-2",
          inDropdown
            ? (!notification.is_read ? "text-gray-900 font-medium" : "text-gray-700")
            : (!notification.is_read && "font-medium")
        )}>
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <p className={cn(
            "text-xs",
            inDropdown ? "text-gray-500" : "text-muted-foreground"
          )}>
            {formatCreatedAt(notification.created_at)}
          </p>
          {actorName && (
            <>
              <span className={cn(
                "text-xs",
                inDropdown ? "text-gray-300" : "text-muted-foreground/50"
              )}>•</span>
              <p className={cn(
                "text-xs truncate flex items-center gap-1",
                inDropdown ? "text-gray-500" : "text-muted-foreground"
              )}>
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
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            inDropdown
              ? "bg-blue-500 shadow-lg shadow-blue-500/30"
              : "bg-primary shadow-sm shadow-primary/50"
          )} />
        </div>
      )}
    </Link>
  );
}
