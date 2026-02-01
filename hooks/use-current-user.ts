"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useFindUniqueprofiles, useUpdateprofiles } from "@/lib/hooks/profiles";
import { useAuth, clearAuthCache } from "./use-auth";

// Тип для отображения - без created_at/updated_at (используем select в запросе)
export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  is_company: boolean;
  avatar_url: string | null;
  about: string | null;
  company_name: string | null;
  registration_number: string | null;
  is_deleted: boolean;
  // Язык интерфейса (mn, ru, en)
  preferred_language: string;
  // Денормализованные статистики (обновляются триггером в БД)
  avg_rating: number | null;
  reviews_count: number;
  completed_jobs_count: number;
};

// Cache profile in localStorage for instant display on page load
const PROFILE_CACHE_KEY = "cached_profile";
const PROFILE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCachedProfile(userId: string): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;
    const { profile, timestamp, id } = JSON.parse(cached);
    if (id !== userId) return null;
    if (Date.now() - timestamp > PROFILE_CACHE_TTL) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

function setCachedProfile(userId: string, profile: Profile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({ profile, timestamp: Date.now(), id: userId })
    );
  } catch {
    // Ignore localStorage errors
  }
}

export function clearProfileCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Ignore
  }
}

export function useCurrentUser() {
  // Используем общий хук для auth - предотвращает дублирование запросов
  const { user, isLoading: isAuthLoading } = useAuth();
  const supabase = createClient();

  // Get cached profile for instant display
  const cachedProfile = React.useMemo(
    () => (user?.id ? getCachedProfile(user.id) : null),
    [user?.id]
  );

  // ВАЖНО: Мутационный хук должен вызываться ДО условного запроса,
  // чтобы порядок хуков был стабильным независимо от состояния user
  const updateProfileMutation = useUpdateprofiles();

  // Fetch profile using ZenStack hook - optimized with select
  const {
    data: fetchedProfile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useFindUniqueprofiles(
    {
      where: { id: user?.id ?? "" },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        is_company: true,
        avatar_url: true,
        about: true,
        company_name: true,
        registration_number: true,
        is_deleted: true,
        preferred_language: true,
        // Денормализованные статистики - убирают 2 отдельных запроса на странице профиля
        avg_rating: true,
        reviews_count: true,
        completed_jobs_count: true,
        // Исключаем created_at и updated_at - не нужны для отображения
      },
    },
    {
      enabled: !!user?.id,
      staleTime: 30 * 60 * 1000, // 30 минут - профиль редко меняется
      gcTime: 60 * 60 * 1000, // 1 час в памяти
      // Use cached profile as initial data for instant display
      initialData: cachedProfile ?? undefined,
    }
  );

  // Use fetched profile or fall back to cached
  const profile = fetchedProfile ?? cachedProfile;

  // Update cache when profile is fetched
  React.useEffect(() => {
    if (fetchedProfile && user?.id) {
      setCachedProfile(user.id, fetchedProfile);
    }
  }, [fetchedProfile, user?.id]);

  const updateProfile = async (data: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>) => {
    if (!user?.id) return { error: "Not authenticated" };

    try {
      await updateProfileMutation.mutateAsync({
        where: { id: user.id },
        data,
      });
      // Clear cache to force refresh
      clearProfileCache();
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Update failed" };
    }
  };

  // Upload avatar
  const uploadAvatar = async (file: File) => {
    if (!user?.id) return { error: "Not authenticated", url: null };

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      return { error: uploadError.message, url: null };
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Update profile with new avatar URL using mutation
    const { error: updateError } = await updateProfile({ avatar_url: avatarUrl });

    if (updateError) {
      return { error: updateError, url: null };
    }

    return { error: null, url: avatarUrl };
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthCache(); // Очищаем кэш auth при выходе
    clearProfileCache(); // Очищаем кэш профиля
    window.location.href = "/"; // Переход на главную страницу
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  // Sign up
  const signUp = async (
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
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    return { error: error?.message ?? null };
  };

  // Loading: only true if we have no cached data AND we're still loading
  const isLoading = isAuthLoading || (isProfileLoading && !cachedProfile);
  const isAuthenticated = !!user;

  // Мемоизированное display name
  const displayName = React.useMemo(() => {
    if (profile) {
      if (profile.is_company) {
        return profile.company_name || "Компани";
      }
      const name = `${profile.first_name?.[0] || ""}. ${profile.last_name || ""}`.trim();
      return name || "Хэрэглэгч";
    }
    return user?.email?.split("@")[0] || "Хэрэглэгч";
  }, [profile, user?.email]);

  // Мемоизированный avatar URL
  const avatarUrl = React.useMemo(() => {
    return profile?.avatar_url ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
  }, [profile?.avatar_url, displayName]);

  return {
    user,
    profile,
    isLoading,
    isAuthenticated,
    displayName,
    avatarUrl,
    error: profileError,
    signIn,
    signUp,
    signOut,
    updateProfile,
    uploadAvatar,
    refetchProfile,
  };
}
