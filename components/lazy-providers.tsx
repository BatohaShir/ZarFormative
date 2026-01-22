"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/auth-context";

// Lazy-load MessagesProvider - загружается только для авторизованных пользователей
// Экономит ~2-3KB gzipped для гостей
const MessagesProvider = dynamic(
  () => import("@/contexts/messages-context").then((mod) => mod.MessagesProvider),
  { ssr: false }
);

// Lazy-load NotificationsProvider
const NotificationsProvider = dynamic(
  () => import("@/contexts/notifications-context").then((mod) => mod.NotificationsProvider),
  { ssr: false }
);

// Пустой провайдер для гостей - не загружает контексты
function GuestProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Lazy-загрузка провайдеров для гостей
 * - Авторизованные: полный MessagesProvider
 * - Гости: пустая обёртка (без загрузки модуля)
 */
export function LazyMessagesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Пока загружается auth - используем пустой провайдер
  // После загрузки - если авторизован, подгружаем MessagesProvider
  if (isLoading || !isAuthenticated) {
    return <GuestProvider>{children}</GuestProvider>;
  }

  return <MessagesProvider>{children}</MessagesProvider>;
}

/**
 * Lazy-загрузка NotificationsProvider
 * - Авторизованные: полный NotificationsProvider
 * - Гости: пустая обёртка
 */
export function LazyNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return <GuestProvider>{children}</GuestProvider>;
  }

  return <NotificationsProvider>{children}</NotificationsProvider>;
}
