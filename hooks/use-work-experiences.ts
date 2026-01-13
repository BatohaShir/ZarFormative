"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  useFindManyprofiles_work_experiences,
  useCreateprofiles_work_experiences,
  useUpdateprofiles_work_experiences,
  useDeleteprofiles_work_experiences,
} from "@/lib/hooks/profiles-work-experiences";
import type { profiles_work_experiences } from "@prisma/client";

export type WorkExperience = profiles_work_experiences;

export interface CreateWorkExperienceInput {
  company: string;
  position: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  is_current?: boolean;
}

export interface UpdateWorkExperienceInput {
  company?: string;
  position?: string;
  description?: string;
  start_date?: Date;
  end_date?: Date;
  is_current?: boolean;
}

export function useWorkExperiences(userId?: string) {
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

  // Fetch work experiences
  const {
    data: workExperiences,
    isLoading,
    error,
    refetch,
  } = useFindManyprofiles_work_experiences(
    {
      where: { user_id: targetUserId ?? "" },
      orderBy: { start_date: "desc" },
    },
    { enabled: !!targetUserId }
  );

  // Mutations
  const createMutation = useCreateprofiles_work_experiences();
  const updateMutation = useUpdateprofiles_work_experiences();
  const deleteMutation = useDeleteprofiles_work_experiences();

  const createWorkExperience = async (data: CreateWorkExperienceInput) => {
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

  const updateWorkExperience = async (id: string, data: UpdateWorkExperienceInput) => {
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

  const deleteWorkExperience = async (id: string) => {
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
    workExperiences: workExperiences ?? [],
    isLoading,
    error,
    isOwner,
    createWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
    refetch,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
