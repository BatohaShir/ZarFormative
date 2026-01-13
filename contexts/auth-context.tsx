"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  is_company: boolean;
  avatar_url: string | null;
  company_name: string | null;
  registration_number: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch profile from database
  const fetchProfile = React.useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile;
  }, []);

  // Refresh profile
  const refreshProfile = React.useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  // Initialize auth state
  React.useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      }
      setIsLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign in with email and password
  const signIn = React.useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    },
    []
  );

  // Sign up with email and password
  const signUp = React.useCallback(
    async (
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
    ): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    },
    []
  );

  // Sign out
  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
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
