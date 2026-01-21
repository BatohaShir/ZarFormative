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

// Пустой провайдер для гостей - не загружает MessagesContext
function GuestMessagesProvider({ children }: { children: React.ReactNode }) {
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
    return <GuestMessagesProvider>{children}</GuestMessagesProvider>;
  }

  return <MessagesProvider>{children}</MessagesProvider>;
}
