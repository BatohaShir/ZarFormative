"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  useFindManyprofiles_educations,
  useCreateprofiles_educations,
  useUpdateprofiles_educations,
  useDeleteprofiles_educations,
} from "@/lib/hooks/profiles-educations";
import type { profiles_educations } from "@prisma/client";

export type Education = profiles_educations;

export interface CreateEducationInput {
  degree: string;
  institution: string;
  field_of_study?: string;
  start_date: Date;
  end_date?: Date;
  is_current?: boolean;
}

export interface UpdateEducationInput {
  degree?: string;
  institution?: string;
  field_of_study?: string;
  start_date?: Date;
  end_date?: Date;
  is_current?: boolean;
}

export function useEducations(userId?: string) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    getUser();
  }, [supabase]);

  const targetUserId = userId || currentUserId;

  // Fetch educations
  const {
    data: educations,
    isLoading,
    error,
    refetch,
  } = useFindManyprofiles_educations(
    {
      where: { user_id: targetUserId ?? "" },
      orderBy: { start_date: "desc" },
    },
    { enabled: !!targetUserId }
  );

  // Mutations
  const createMutation = useCreateprofiles_educations();
  const updateMutation = useUpdateprofiles_educations();
  const deleteMutation = useDeleteprofiles_educations();

  const createEducation = async (data: CreateEducationInput) => {
    if (!currentUserId) return { error: "Not authenticated" };

    try {
      await createMutation.mutateAsync({
        data: {
          ...data,
          user_id: currentUserId,
        },
      });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Create failed" };
    }
  };

  const updateEducation = async (id: string, data: UpdateEducationInput) => {
    if (!currentUserId) return { error: "Not authenticated" };

    try {
      await updateMutation.mutateAsync({
        where: { id },
        data,
      });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Update failed" };
    }
  };

  const deleteEducation = async (id: string) => {
    if (!currentUserId) return { error: "Not authenticated" };

    try {
      await deleteMutation.mutateAsync({
        where: { id },
      });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Delete failed" };
    }
  };

  const isOwner = targetUserId === currentUserId;

  return {
    educations: educations ?? [],
    isLoading,
    error,
    isOwner,
    createEducation,
    updateEducation,
    deleteEducation,
    refetch,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
