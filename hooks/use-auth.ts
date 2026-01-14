"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

// Глобальное состояние auth - singleton
let globalUser: User | null = null;
let globalIsLoading = true;
let globalInitialized = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribeToAuth(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// Инициализация auth один раз глобально
async function initAuth() {
  if (globalInitialized) return;
  globalInitialized = true;

  const supabase = createClient();

  try {
    const { data } = await supabase.auth.getUser();
    globalUser = data.user;
  } catch {
    globalUser = null;
  } finally {
    globalIsLoading = false;
    notifyListeners();
  }

  supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
    globalUser = session?.user ?? null;
    globalIsLoading = false;
    notifyListeners();
  });
}

/**
 * Хук для получения текущего пользователя.
 * Использует глобальный singleton для предотвращения дублирования запросов.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(globalUser);
  const [isLoading, setIsLoading] = useState(globalIsLoading);

  useEffect(() => {
    // Инициализируем при первом использовании
    initAuth();

    // Синхронизируем локальное состояние с глобальным
    const updateState = () => {
      setUser(globalUser);
      setIsLoading(globalIsLoading);
    };

    // Сразу обновляем, если глобальное состояние уже изменилось
    updateState();

    // Подписываемся на изменения
    const unsubscribe = subscribeToAuth(updateState);

    return unsubscribe;
  }, []);

  return {
    user,
    userId: user?.id ?? null,
    isLoading,
    isAuthenticated: !!user,
  };
}

// Утилита для очистки при logout
export function clearAuthCache() {
  globalUser = null;
  globalIsLoading = false;
  notifyListeners();
}
