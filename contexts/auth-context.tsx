"use client";

import * as React from "react";
import { useCurrentUser, type Profile } from "@/hooks/use-current-user";
import type { User } from "@supabase/supabase-js";
import { LOCALE_COOKIE, isValidLocale } from "@/i18n/config";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  displayName: string;
  avatarUrl: string;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    metadata: {
      first_name?: string;
      last_name?: string;
      phone_number?: string;
      is_company?: boolean;
      company_name?: string;
      registration_number?: string;
    }
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<{ error: string | null; url: string | null }>;
  updateProfile: (data: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>) => Promise<{ error: string | null }>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Быстрое получение cookie
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

// Ключ для отслеживания смены языка пользователем
const LOCALE_CHANGED_KEY = "locale_changed_by_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    profile,
    isLoading,
    isAuthenticated,
    displayName,
    avatarUrl,
    signIn,
    signUp,
    signOut,
    uploadAvatar,
    updateProfile,
    refetchProfile,
  } = useCurrentUser();

  const refreshProfile = React.useCallback(async () => {
    await refetchProfile();
  }, [refetchProfile]);

  // Синхронизация языка из БД при логине
  // Приоритет: БД > cookie/localStorage (для синхронизации между устройствами)
  const syncedRef = React.useRef(false);
  const prevUserIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const preferredLang = profile?.preferred_language;
    const currentUserId = user?.id ?? null;

    // Детектим новый логин (смена пользователя)
    const isNewLogin = currentUserId && currentUserId !== prevUserIdRef.current;
    prevUserIdRef.current = currentUserId;

    // Быстрый выход если нет данных
    if (!preferredLang || !isValidLocale(preferredLang)) {
      return;
    }

    // Если уже синхронизировали для этого пользователя - выходим
    if (syncedRef.current && !isNewLogin) {
      return;
    }

    // Проверяем, менял ли пользователь язык локально В ЭТОЙ СЕССИИ
    const userChangedLocale = sessionStorage.getItem(LOCALE_CHANGED_KEY);
    if (userChangedLocale) {
      // Пользователь сам менял язык - очищаем флаг и НЕ синхронизируем
      sessionStorage.removeItem(LOCALE_CHANGED_KEY);
      syncedRef.current = true;
      return;
    }

    const currentCookie = getCookie(LOCALE_COOKIE);

    // Синхронизируем если:
    // 1. Это новый логин (приоритет БД над локальными настройками)
    // 2. Или язык в cookie отличается от БД
    if (isNewLogin || currentCookie !== preferredLang) {
      syncedRef.current = true;
      document.cookie = `${LOCALE_COOKIE}=${preferredLang};path=/;max-age=31536000;SameSite=Lax`;
      localStorage.setItem("locale", preferredLang);
      // Перезагружаем только если язык реально изменился
      if (currentCookie !== preferredLang) {
        window.location.reload();
      }
    } else {
      syncedRef.current = true;
    }
  }, [profile?.preferred_language, user?.id]);

  const contextValue = React.useMemo<AuthContextType>(
    () => ({
      user,
      profile: profile ?? null,
      isAuthenticated,
      isLoading,
      displayName,
      avatarUrl,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      uploadAvatar,
      updateProfile,
    }),
    [
      user,
      profile,
      isAuthenticated,
      isLoading,
      displayName,
      avatarUrl,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      uploadAvatar,
      updateProfile,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
