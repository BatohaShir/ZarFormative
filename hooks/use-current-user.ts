"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFindUniqueprofiles, useUpdateprofiles } from "@/lib/hooks/profiles";
import type { User } from "@supabase/supabase-js";
import type { profiles } from "@prisma/client";

export type Profile = profiles;

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsAuthLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Fetch profile using ZenStack hook
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useFindUniqueprofiles(
    { where: { id: user?.id ?? "" } },
    { enabled: !!user?.id }
  );

  // Update profile mutation
  const updateProfileMutation = useUpdateprofiles();

  const updateProfile = async (data: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>) => {
    if (!user?.id) return { error: "Not authenticated" };

    try {
      await updateProfileMutation.mutateAsync({
        where: { id: user.id },
        data,
      });
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
    setUser(null);
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

  const isLoading = isAuthLoading || isProfileLoading;
  const isAuthenticated = !!user;

  // Display name helper
  const displayName = profile
    ? profile.is_company
      ? profile.company_name || "Компани"
      : `${profile.first_name?.[0] || ""}. ${profile.last_name || ""}`.trim() || "Хэрэглэгч"
    : user?.email?.split("@")[0] || "Хэрэглэгч";

  // Avatar URL helper
  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

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
