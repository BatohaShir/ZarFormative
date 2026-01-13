"use client";

import * as React from "react";
import { useCurrentUser, type Profile } from "@/hooks/use-current-user";
import type { User } from "@supabase/supabase-js";

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

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
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
