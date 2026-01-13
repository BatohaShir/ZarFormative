"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Хук для получения текущего пользователя.
 * Использует useRef для предотвращения дублирования запросов в рамках компонента.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Предотвращаем двойной fetch в StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    // Подписываемся на изменения auth состояния
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    user,
    userId: user?.id ?? null,
    isLoading,
    isAuthenticated: !!user,
  };
}

// Утилита для очистки - теперь не нужна, но оставляем для совместимости
export function clearAuthCache() {
  // no-op
}
