"use client";

import {
  useFindManyprofiles_educations,
  useCreateprofiles_educations,
  useUpdateprofiles_educations,
  useDeleteprofiles_educations,
} from "@/lib/hooks/profiles-educations";
import { useAuth } from "./use-auth";
// Тип для отображения - без created_at/updated_at (используем select в запросе)
export type Education = {
  id: string;
  user_id: string;
  degree: string;
  institution: string;
  field_of_study: string | null;
  start_date: Date;
  end_date: Date | null;
  is_current: boolean;
};

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
  // Используем общий хук для auth - предотвращает дублирование запросов
  const { userId: currentUserId } = useAuth();

  const targetUserId = userId || currentUserId;

  // Fetch educations - optimized with select to reduce data transfer
  const {
    data: educations,
    isLoading,
    error,
    refetch,
  } = useFindManyprofiles_educations(
    {
      where: { user_id: targetUserId ?? "" },
      orderBy: { start_date: "desc" },
      select: {
        id: true,
        user_id: true,
        degree: true,
        institution: true,
        field_of_study: true,
        start_date: true,
        end_date: true,
        is_current: true,
        // Исключаем created_at и updated_at - не нужны для отображения
      },
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
