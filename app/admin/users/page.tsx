"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  useFindManyprofiles,
  useUpdateprofiles,
} from "@/lib/hooks/profiles";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { UserRole } from "@prisma/client";
import {
  Search,
  Loader2,
  Users,
  Shield,
  User,
  Building,
  ChevronDown,
  Check,
  Star,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Тип профиля
type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  is_company: boolean;
  avatar_url: string | null;
  company_name: string | null;
  role: UserRole;
  is_deleted: boolean;
  avg_rating: number | null;
  reviews_count: number;
  completed_jobs_count: number;
  created_at: Date;
};

// Информация о ролях
const ROLE_INFO: Record<UserRole, { label: string; icon: typeof User; color: string }> = {
  user: {
    label: "Пользователь",
    icon: User,
    color: "text-gray-600 bg-gray-100 dark:bg-gray-800",
  },
  manager: {
    label: "Менеджер",
    icon: Briefcase,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  },
  admin: {
    label: "Админ",
    icon: Shield,
    color: "text-red-600 bg-red-100 dark:bg-red-900/30",
  },
};

// Skeleton компонент
function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch users с оптимизированным select
  const { data: users, isLoading, refetch } = useFindManyprofiles(
    {
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        is_company: true,
        avatar_url: true,
        company_name: true,
        role: true,
        is_deleted: true,
        avg_rating: true,
        reviews_count: true,
        completed_jobs_count: true,
        created_at: true,
      },
    },
    {
      staleTime: 5 * 60 * 1000, // 5 минут
    }
  );

  // Update mutation
  const updateMutation = useUpdateprofiles();

  // Realtime подписка
  const refetchProfiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    queryClient.refetchQueries({ queryKey: ["profiles"], type: "active" });
  }, [queryClient]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-profiles")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log("[Admin Users] Profile changed:", payload.eventType);
          refetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchProfiles]);

  // Фильтрация пользователей
  const filteredUsers = (users || []).filter((user) => {
    // Поиск
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.phone_number?.toLowerCase().includes(searchLower) ||
      user.company_name?.toLowerCase().includes(searchLower);

    // Фильтр по роли
    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Изменение роли
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateMutation.mutateAsync({
        where: { id: userId },
        data: { role: newRole },
      });
      setOpenDropdown(null);
      refetch();
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  // Статистика
  const stats = {
    total: users?.length || 0,
    users: users?.filter((u) => u.role === "user").length || 0,
    managers: users?.filter((u) => u.role === "manager").length || 0,
    admins: users?.filter((u) => u.role === "admin").length || 0,
  };

  // Получить display name
  const getDisplayName = (user: Profile) => {
    if (user.is_company) {
      return user.company_name || "Компани";
    }
    const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return name || "Хэрэглэгч";
  };

  // Render аватар
  const renderAvatar = (user: Profile) => {
    const displayName = getDisplayName(user);

    if (user.avatar_url) {
      return (
        <div className="w-10 h-10 rounded-full overflow-hidden relative bg-gray-100 dark:bg-gray-800">
          <Image
            src={user.avatar_url}
            alt={displayName}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      );
    }

    return (
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {user.is_company ? (
          <Building className="h-5 w-5 text-gray-400" />
        ) : (
          <span className="text-sm font-medium text-gray-500">
            {displayName[0]?.toUpperCase() || "?"}
          </span>
        )}
      </div>
    );
  };

  // Render role dropdown
  const renderRoleDropdown = (user: Profile) => {
    const isOpen = openDropdown === user.id;
    const roleInfo = ROLE_INFO[user.role];
    const Icon = roleInfo.icon;

    return (
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : user.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            roleInfo.color,
            "hover:opacity-80"
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{roleInfo.label}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpenDropdown(null)}
            />
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 min-w-[160px] py-1">
              {(Object.keys(ROLE_INFO) as UserRole[]).map((role) => {
                const info = ROLE_INFO[role];
                const RoleIcon = info.icon;
                const isSelected = user.role === role;

                return (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(user.id, role)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                      isSelected && "bg-gray-50 dark:bg-gray-800/50"
                    )}
                    disabled={updateMutation.isPending}
                  >
                    <RoleIcon className={cn("h-4 w-4", info.color.split(" ")[0])} />
                    <span className="flex-1 text-left">{info.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-green-500" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Пользователи
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Просмотр и управление ролями пользователей
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-sm text-gray-500">Всего</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-600">
            {stats.users}
          </div>
          <div className="text-sm text-gray-500">Пользователей</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-blue-600">
            {stats.managers}
          </div>
          <div className="text-sm text-gray-500">Менеджеров</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-red-600">
            {stats.admins}
          </div>
          <div className="text-sm text-gray-500">Админов</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по имени, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          />
        </div>

        {/* Role filter */}
        <div className="flex gap-2">
          {(["all", "user", "manager", "admin"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                roleFilter === role
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {role === "all" ? "Все" : ROLE_INFO[role].label}
            </button>
          ))}
        </div>
      </div>

      {/* Users list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <UserRowSkeleton key={i} />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Users className="h-12 w-12 mb-4 text-gray-300" />
            <p>Пользователи не найдены</p>
          </div>
        ) : (
          <div>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                  user.is_deleted && "opacity-50"
                )}
              >
                {/* Avatar */}
                {renderAvatar(user as Profile)}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {getDisplayName(user as Profile)}
                    </span>
                    {user.is_company && (
                      <span className="px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded">
                        Компания
                      </span>
                    )}
                    {user.is_deleted && (
                      <span className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 rounded">
                        Удалён
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {user.phone_number && <span>{user.phone_number}</span>}
                    {user.avg_rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {user.avg_rating.toFixed(1)}
                      </span>
                    )}
                    {user.completed_jobs_count > 0 && (
                      <span>{user.completed_jobs_count} заказов</span>
                    )}
                  </div>
                </div>

                {/* Role dropdown */}
                {renderRoleDropdown(user as Profile)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
