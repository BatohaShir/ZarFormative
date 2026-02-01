"use client";

import { useCallback, useRef } from "react";
import { useLocale as useNextIntlLocale } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import {
  type Locale,
  locales,
  defaultLocale,
  isValidLocale,
  LOCALE_COOKIE,
} from "@/i18n/config";

// Ключ для отслеживания смены языка пользователем
const LOCALE_CHANGED_KEY = "locale_changed_by_user";

/**
 * Хук для управления локалью приложения
 */
export function useLocale() {
  const currentLocale = useNextIntlLocale() as Locale;
  const { updateProfile, isAuthenticated } = useAuth();
  const isChangingRef = useRef(false);

  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (newLocale === currentLocale) return;
      if (!isValidLocale(newLocale)) return;
      if (isChangingRef.current) return;

      isChangingRef.current = true;

      // Ставим флаг что пользователь сам меняет язык
      // Это предотвратит синхронизацию из БД в auth-context
      sessionStorage.setItem(LOCALE_CHANGED_KEY, "true");

      // 1. Обновить cookie (для SSR)
      document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=31536000;SameSite=Lax`;

      // 2. Обновить localStorage
      localStorage.setItem("locale", newLocale);

      // 3. Обновить в БД (если авторизован) - не ждём
      if (isAuthenticated) {
        updateProfile({ preferred_language: newLocale }).catch(() => {});
      }

      // 4. Перезагрузить страницу
      window.location.reload();
    },
    [currentLocale, isAuthenticated, updateProfile]
  );

  return {
    locale: currentLocale,
    locales,
    defaultLocale,
    setLocale,
  } as const;
}
