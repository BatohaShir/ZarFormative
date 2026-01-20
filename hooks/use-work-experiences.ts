"use client";

import {
  useFindManyprofiles_work_experiences,
  useCreateprofiles_work_experiences,
  useUpdateprofiles_work_experiences,
  useDeleteprofiles_work_experiences,
} from "@/lib/hooks/profiles-work-experiences";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const targetUserId = userId || currentUserId;
  const queryKey = ["profiles_work_experiences", "findMany", { where: { user_id: targetUserId ?? "" } }];

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
    {
      enabled: !!targetUserId,
      staleTime: 10 * 60 * 1000, // 10 минут - опыт работы редко меняется
      gcTime: 30 * 60 * 1000, // 30 минут в памяти
    }
  );

  // Mutations
  const createMutation = useCreateprofiles_work_experiences();
  const updateMutation = useUpdateprofiles_work_experiences();
  const deleteMutation = useDeleteprofiles_work_experiences();

  // Optimistic create - мгновенно добавляем в UI, потом синхронизируем с сервером
  const createWorkExperience = async (data: CreateWorkExperienceInput) => {
    if (!currentUserId) return { error: "Not authenticated" };

    // Создаём оптимистичную запись
    const optimisticWork: WorkExperience = {
      id: `temp-${Date.now()}`, // Временный ID
      user_id: currentUserId,
      company: data.company,
      position: data.position,
      description: data.description ?? null,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      is_current: data.is_current ?? false,
    };

    // Сохраняем предыдущее состояние для rollback
    const previousData = queryClient.getQueryData(queryKey);

    // Оптимистично добавляем в кэш
    queryClient.setQueryData(queryKey, (old: WorkExperience[] | undefined) => {
      return old ? [...old, optimisticWork] : [optimisticWork];
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
  const updateWorkExperience = async (id: string, data: UpdateWorkExperienceInput) => {
    if (!currentUserId) return { error: "Not authenticated" };

    // Сохраняем предыдущее состояние
    const previousData = queryClient.getQueryData(queryKey);

    // Оптимистично обновляем в кэше
    queryClient.setQueryData(queryKey, (old: WorkExperience[] | undefined) => {
      if (!old) return old;
      return old.map((work) =>
        work.id === id ? { ...work, ...data } : work
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
  const deleteWorkExperience = async (id: string) => {
    if (!currentUserId) return { error: "Not authenticated" };

    // Сохраняем предыдущее состояние
    const previousData = queryClient.getQueryData(queryKey);

    // Оптимистично удаляем из кэша
    queryClient.setQueryData(queryKey, (old: WorkExperience[] | undefined) => {
      if (!old) return old;
      return old.filter((work) => work.id !== id);
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
