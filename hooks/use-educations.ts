"use client";

import {
  useFindManyprofiles_educations,
  useCreateprofiles_educations,
  useUpdateprofiles_educations,
  useDeleteprofiles_educations,
} from "@/lib/hooks/profiles-educations";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const targetUserId = userId || currentUserId;
  const queryKey = ["profiles_educations", "findMany", { where: { user_id: targetUserId ?? "" } }];

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
    {
      enabled: !!targetUserId,
      staleTime: 10 * 60 * 1000, // 10 минут - образование редко меняется
      gcTime: 30 * 60 * 1000, // 30 минут в памяти
    }
  );

  // Mutations
  const createMutation = useCreateprofiles_educations();
  const updateMutation = useUpdateprofiles_educations();
  const deleteMutation = useDeleteprofiles_educations();

  // Optimistic create - мгновенно добавляем в UI, потом синхронизируем с сервером
  const createEducation = async (data: CreateEducationInput) => {
    if (!currentUserId) return { error: "Not authenticated" };

    // Создаём оптимистичную запись
    const optimisticEdu: Education = {
      id: `temp-${Date.now()}`, // Временный ID
      user_id: currentUserId,
      degree: data.degree,
      institution: data.institution,
      field_of_study: data.field_of_study ?? null,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      is_current: data.is_current ?? false,
    };

    // Сохраняем предыдущее состояние для rollback
    const previousData = queryClient.getQueryData(queryKey);

    // Оптимистично добавляем в кэш
    queryClient.setQueryData(queryKey, (old: Education[] | undefined) => {
      return old ? [...old, optimisticEdu] : [optimisticEdu];
    });

    try {
      await createMutation.mutateAsync({
        data: {
          ...data,
          user_id: currentUserId,
        },
      });
      // После успеха - инвалидируем для получения реального ID
      queryClient.invalidateQueries({ queryKey });
      return { error: null };
    } catch (error) {
      // Rollback при ошибке
      queryClient.setQueryData(queryKey, previousData);
      return { error: error instanceof Error ? error.message : "Create failed" };
    }
  };

  // Optimistic update - мгновенно обновляем в UI
  const updateEducation = async (id: string, data: UpdateEducationInput) => {
    if (!currentUserId) return { error: "Not authenticated" };

    // Сохраняем предыдущее состояние
    const previousData = queryClient.getQueryData(queryKey);

    // Оптимистично обновляем в кэше
    queryClient.setQueryData(queryKey, (old: Education[] | undefined) => {
      if (!old) return old;
      return old.map((edu) =>
        edu.id === id ? { ...edu, ...data } : edu
      );
    });

    try {
      await updateMutation.mutateAsync({
        where: { id },
        data,
      });
      return { error: null };
    } catch (error) {
      // Rollback при ошибке
      queryClient.setQueryData(queryKey, previousData);
      return { error: error instanceof Error ? error.message : "Update failed" };
    }
  };

  // Optimistic delete - мгновенно удаляем из UI
  const deleteEducation = async (id: string) => {
    if (!currentUserId) return { error: "Not authenticated" };

    // Сохраняем предыдущее состояние
    const previousData = queryClient.getQueryData(queryKey);

    // Оптимистично удаляем из кэша
    queryClient.setQueryData(queryKey, (old: Education[] | undefined) => {
      if (!old) return old;
      return old.filter((edu) => edu.id !== id);
    });

    try {
      await deleteMutation.mutateAsync({
        where: { id },
      });
      return { error: null };
    } catch (error) {
      // Rollback при ошибке
      queryClient.setQueryData(queryKey, previousData);
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
