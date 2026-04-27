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

interface UseWorkExperiencesOptions {
  /** When false, skip the query (e.g. company accounts). */
  enabled?: boolean;
}

export function useWorkExperiences(userId?: string, options?: UseWorkExperiencesOptions) {
  // Используем общий хук для auth - предотвращает дублирование запросов
  const { userId: currentUserId } = useAuth();
  const queryClient = useQueryClient();

  const targetUserId = userId || currentUserId;
  // Prefix-match for ZenStack's actual cache key shape
  // ["zenstack", model, op, args, options]. The previous narrow
  // exact key (without "zenstack") never matched the slot the hook
  // reads from, so optimistic mutations silently no-oped.
  const queryKeyPrefix = ["zenstack", "profiles_work_experiences", "findMany"];

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
      enabled: !!targetUserId && options?.enabled !== false,
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

    const snapshots = queryClient.getQueriesData<WorkExperience[]>({
      queryKey: queryKeyPrefix,
    });

    queryClient.setQueriesData<WorkExperience[]>({ queryKey: queryKeyPrefix }, (old) =>
      old ? [...old, optimisticWork] : [optimisticWork]
    );

    try {
      await createMutation.mutateAsync({
        data: { ...data, user_id: currentUserId },
      });
      queryClient.invalidateQueries({ queryKey: queryKeyPrefix });
      return { error: null };
    } catch (error) {
      for (const [key, prev] of snapshots) queryClient.setQueryData(key, prev);
      return { error: error instanceof Error ? error.message : "Create failed" };
    }
  };

  // Optimistic update - мгновенно обновляем в UI
  const updateWorkExperience = async (id: string, data: UpdateWorkExperienceInput) => {
    if (!currentUserId) return { error: "Not authenticated" };

    const snapshots = queryClient.getQueriesData<WorkExperience[]>({
      queryKey: queryKeyPrefix,
    });

    queryClient.setQueriesData<WorkExperience[]>({ queryKey: queryKeyPrefix }, (old) => {
      if (!old) return old;
      return old.map((work) => (work.id === id ? { ...work, ...data } : work));
    });

    try {
      await updateMutation.mutateAsync({ where: { id }, data });
      return { error: null };
    } catch (error) {
      for (const [key, prev] of snapshots) queryClient.setQueryData(key, prev);
      return { error: error instanceof Error ? error.message : "Update failed" };
    }
  };

  // Optimistic delete - мгновенно удаляем из UI
  const deleteWorkExperience = async (id: string) => {
    if (!currentUserId) return { error: "Not authenticated" };

    const snapshots = queryClient.getQueriesData<WorkExperience[]>({
      queryKey: queryKeyPrefix,
    });

    queryClient.setQueriesData<WorkExperience[]>({ queryKey: queryKeyPrefix }, (old) => {
      if (!old) return old;
      return old.filter((work) => work.id !== id);
    });

    try {
      await deleteMutation.mutateAsync({ where: { id } });
      return { error: null };
    } catch (error) {
      for (const [key, prev] of snapshots) queryClient.setQueryData(key, prev);
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
