"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useFindManylisting_requests,
} from "@/lib/hooks/listing-requests";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  Search,
  Loader2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  AlertCircle,
  HelpCircle,
  CreditCard,
  Ban,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Типы статусов
type RequestStatus =
  | "pending"
  | "price_proposed"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "awaiting_client_confirmation"
  | "awaiting_completion_details"
  | "awaiting_payment"
  | "completed"
  | "cancelled_by_client"
  | "cancelled_by_provider"
  | "disputed";

// Тип заявки
type ListingRequest = {
  id: string;
  message: string | null;
  status: RequestStatus;
  client_phone: string | null;
  created_at: Date;
  listing: {
    id: string;
    title: string;
  } | null;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    is_company: boolean;
  } | null;
  provider: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    is_company: boolean;
  } | null;
};

// Информация о статусах
const STATUS_INFO: Record<RequestStatus, { label: string; icon: typeof Clock; color: string }> = {
  pending: {
    label: "Ожидает",
    icon: Clock,
    color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
  },
  price_proposed: {
    label: "Цена предложена",
    icon: CreditCard,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  },
  accepted: {
    label: "Принято",
    icon: CheckCircle,
    color: "text-green-600 bg-green-100 dark:bg-green-900/30",
  },
  rejected: {
    label: "Отклонено",
    icon: XCircle,
    color: "text-red-600 bg-red-100 dark:bg-red-900/30",
  },
  in_progress: {
    label: "В работе",
    icon: PlayCircle,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  },
  awaiting_client_confirmation: {
    label: "Ожидает подтверждения",
    icon: HelpCircle,
    color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
  },
  awaiting_completion_details: {
    label: "Ожидает детали",
    icon: MessageSquare,
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  },
  awaiting_payment: {
    label: "Ожидает оплату",
    icon: CreditCard,
    color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  },
  completed: {
    label: "Завершено",
    icon: CheckCircle,
    color: "text-green-600 bg-green-100 dark:bg-green-900/30",
  },
  cancelled_by_client: {
    label: "Отменено клиентом",
    icon: Ban,
    color: "text-gray-600 bg-gray-100 dark:bg-gray-800",
  },
  cancelled_by_provider: {
    label: "Отменено исполнителем",
    icon: Ban,
    color: "text-gray-600 bg-gray-100 dark:bg-gray-800",
  },
  disputed: {
    label: "Спор",
    icon: AlertCircle,
    color: "text-red-600 bg-red-100 dark:bg-red-900/30",
  },
};

// Skeleton компонент
function RequestRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

// Группы статусов для быстрой фильтрации
const STATUS_GROUPS = {
  all: "Все",
  active: "Активные",
  completed: "Завершённые",
  cancelled: "Отменённые",
} as const;

type StatusGroup = keyof typeof STATUS_GROUPS;

const STATUS_BY_GROUP: Record<StatusGroup, RequestStatus[]> = {
  all: Object.keys(STATUS_INFO) as RequestStatus[],
  active: ["pending", "price_proposed", "accepted", "in_progress", "awaiting_client_confirmation", "awaiting_completion_details", "awaiting_payment"],
  completed: ["completed"],
  cancelled: ["rejected", "cancelled_by_client", "cancelled_by_provider", "disputed"],
};

export default function RequestsPage() {
  const [search, setSearch] = useState("");
  const [statusGroup, setStatusGroup] = useState<StatusGroup>("all");
  const queryClient = useQueryClient();

  // Fetch requests с include
  const { data: requests, isLoading, refetch } = useFindManylisting_requests(
    {
      orderBy: { created_at: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
        client: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            company_name: true,
            is_company: true,
          },
        },
        provider: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            company_name: true,
            is_company: true,
          },
        },
      },
    },
    {
      staleTime: 2 * 60 * 1000, // 2 минуты - заявки меняются часто
    }
  );

  // Realtime подписка
  const refetchRequests = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["listing_requests"] });
    queryClient.refetchQueries({ queryKey: ["listing_requests"], type: "active" });
  }, [queryClient]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listing_requests",
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log("[Admin Requests] Request changed:", payload.eventType);
          refetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchRequests]);

  // Фильтрация
  const filteredRequests = (requests || []).filter((request) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      request.listing?.title?.toLowerCase().includes(searchLower) ||
      request.client?.first_name?.toLowerCase().includes(searchLower) ||
      request.client?.last_name?.toLowerCase().includes(searchLower) ||
      request.provider?.first_name?.toLowerCase().includes(searchLower) ||
      request.provider?.last_name?.toLowerCase().includes(searchLower) ||
      request.client_phone?.toLowerCase().includes(searchLower);

    const matchesGroup = STATUS_BY_GROUP[statusGroup].includes(request.status as RequestStatus);

    return matchesSearch && matchesGroup;
  });

  // Статистика
  const stats = {
    total: requests?.length || 0,
    active: requests?.filter((r) => STATUS_BY_GROUP.active.includes(r.status as RequestStatus)).length || 0,
    completed: requests?.filter((r) => r.status === "completed").length || 0,
    disputed: requests?.filter((r) => r.status === "disputed").length || 0,
  };

  // Получить имя пользователя
  const getUserName = (user: ListingRequest["client"]) => {
    if (!user) return "Неизвестно";
    if (user.is_company) {
      return user.company_name || "Компани";
    }
    const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return name || "Хэрэглэгч";
  };

  // Форматирование даты
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Render status badge
  const renderStatusBadge = (status: RequestStatus) => {
    const info = STATUS_INFO[status];
    const Icon = info.icon;

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          info.color
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{info.label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Заявки
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Просмотр всех заявок на услуги
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
          <div className="text-2xl font-bold text-blue-600">
            {stats.active}
          </div>
          <div className="text-sm text-gray-500">Активных</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-green-600">
            {stats.completed}
          </div>
          <div className="text-sm text-gray-500">Завершённых</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-red-600">
            {stats.disputed}
          </div>
          <div className="text-sm text-gray-500">Споров</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по услуге, клиенту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          />
        </div>

        {/* Status group filter */}
        <div className="flex gap-2">
          {(Object.keys(STATUS_GROUPS) as StatusGroup[]).map((group) => (
            <button
              key={group}
              onClick={() => setStatusGroup(group)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                statusGroup === group
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {STATUS_GROUPS[group]}
            </button>
          ))}
        </div>
      </div>

      {/* Requests list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <RequestRowSkeleton key={i} />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mb-4 text-gray-300" />
            <p>Заявки не найдены</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Услуга
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Исполнитель
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                        {request.listing?.title || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {getUserName(request.client as ListingRequest["client"])}
                      </div>
                      {request.client_phone && (
                        <div className="text-xs text-gray-400">{request.client_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {getUserName(request.provider as ListingRequest["provider"])}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {renderStatusBadge(request.status as RequestStatus)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
