"use client";

import {
  useFindManyprofiles_work_experiences,
  useCreateprofiles_work_experiences,
  useUpdateprofiles_work_experiences,
  useDeleteprofiles_work_experiences,
} from "@/lib/hooks/profiles-work-experiences";
import { useAuth } from "./use-auth";
// Тип для отображения - без created_at/updated_at (используем select в запросе)
export type WorkExperience = {
  id: string;
  user_id: string;
  company: string;
  position: string;
  description: string | null;
  start_date: Date;
  end_date: Date | null;
  is_current: boolean;
};

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
  // Используем общий хук для auth - предотвращает дублирование запросов
  const { userId: currentUserId } = useAuth();

  const targetUserId = userId || currentUserId;

  // Fetch work experiences - optimized with select to reduce data transfer
  const {
    data: workExperiences,
    isLoading,
    error,
    refetch,
  } = useFindManyprofiles_work_experiences(
    {
      where: { user_id: targetUserId ?? "" },
      orderBy: { start_date: "desc" },
      select: {
        id: true,
        user_id: true,
        company: true,
        position: true,
        description: true,
        start_date: true,
        end_date: true,
        is_current: true,
        // Исключаем created_at и updated_at - не нужны для отображения
      },
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
