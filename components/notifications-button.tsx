"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { NotificationBell } from "@/components/notifications";

interface NotificationsButtonProps {
  className?: string;
}

/**
 * Клиентский компонент-обёртка для NotificationBell
 * Показывается только авторизованным пользователям
 */
export function NotificationsButton({ className }: NotificationsButtonProps) {
  const { isAuthenticated } = useAuth();

  // Only show if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <NotificationBell className={className} />;
}
