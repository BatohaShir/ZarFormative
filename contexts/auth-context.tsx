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

  // Синхронизация языка из БД при логине на другом устройстве
  // НЕ синхронизируем если пользователь только что сменил язык локально
  const syncedRef = React.useRef(false);

  React.useEffect(() => {
    const preferredLang = profile?.preferred_language;

    // Быстрый выход
    if (!preferredLang || !isValidLocale(preferredLang) || syncedRef.current) {
      return;
    }

    // Проверяем, менял ли пользователь язык локально
    const userChangedLocale = sessionStorage.getItem(LOCALE_CHANGED_KEY);
    if (userChangedLocale) {
      // Пользователь сам менял язык - очищаем флаг и НЕ синхронизируем
      sessionStorage.removeItem(LOCALE_CHANGED_KEY);
      syncedRef.current = true;
      return;
    }

    const currentCookie = getCookie(LOCALE_COOKIE);

    // Синхронизируем только если язык отличается
    // Это сработает при логине на новом устройстве
    if (currentCookie !== preferredLang) {
      syncedRef.current = true;
      document.cookie = `${LOCALE_COOKIE}=${preferredLang};path=/;max-age=31536000;SameSite=Lax`;
      localStorage.setItem("locale", preferredLang);
      window.location.reload();
    }
  }, [profile?.preferred_language]);

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
