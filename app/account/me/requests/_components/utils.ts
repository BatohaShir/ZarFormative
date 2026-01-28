import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Check,
  XCircle,
  Play,
  CheckCircle,
  X,
  AlertCircle,
  FileText,
  CreditCard,
  HourglassIcon,
} from "lucide-react";
import type { RequestStatus } from "@prisma/client";
import type { RequestWithRelations, PersonInfo } from "./types";

export function formatCreatedAt(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) {
    return `${minutes} минутын өмнө`;
  } else if (hours < 24) {
    return `${hours} цагийн өмнө`;
  } else if (days < 7) {
    return `${days} өдрийн өмнө`;
  } else {
    return d.toLocaleDateString("mn-MN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

// type: "sent" = я отправил заявку (я клиент), "received" = мне пришла заявка (я исполнитель)
export function getStatusBadge(status: RequestStatus, type: "sent" | "received" = "sent") {
  switch (status) {
    case "pending":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
        },
        React.createElement(Clock, { className: "h-3 w-3 mr-1" }),
        "Хүлээгдэж буй"
      );
    case "accepted":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
        },
        React.createElement(Check, { className: "h-3 w-3 mr-1" }),
        "Зөвшөөрсөн"
      );
    case "rejected":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
        },
        React.createElement(XCircle, { className: "h-3 w-3 mr-1" }),
        "Татгалзсан"
      );
    case "in_progress":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
        },
        React.createElement(Play, { className: "h-3 w-3 mr-1" }),
        "Ажиллаж байна"
      );
    case "completed":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
        },
        React.createElement(CheckCircle, { className: "h-3 w-3 mr-1" }),
        "Дууссан"
      );
    case "cancelled_by_client":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800",
        },
        React.createElement(X, { className: "h-3 w-3 mr-1" }),
        type === "sent" ? "Цуцлагдсан" : "Захиалагч цуцалсан"
      );
    case "cancelled_by_provider":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800",
        },
        React.createElement(X, { className: "h-3 w-3 mr-1" }),
        type === "received" ? "Цуцлагдсан" : "Гүйцэтгэгч цуцалсан"
      );
    case "disputed":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
        },
        React.createElement(AlertCircle, { className: "h-3 w-3 mr-1" }),
        "Маргаантай"
      );
    case "awaiting_client_confirmation":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
        },
        React.createElement(HourglassIcon, { className: "h-3 w-3 mr-1" }),
        type === "sent" ? "Баталгаажуулна уу" : "Баталгаажуулах хүлээгдэж байна"
      );
    case "awaiting_completion_details":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
        },
        React.createElement(FileText, { className: "h-3 w-3 mr-1" }),
        type === "received" ? "Тайлан бичнэ үү" : "Тайлан хүлээгдэж байна"
      );
    case "awaiting_payment":
      return React.createElement(
        Badge,
        {
          variant: "outline",
          className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
        },
        React.createElement(CreditCard, { className: "h-3 w-3 mr-1" }),
        type === "received" ? "Төлбөр авна уу" : "Төлбөр хүлээгдэж байна"
      );
    default:
      return null;
  }
}

export function getPersonName(person: PersonInfo): string {
  if (person.is_company && person.company_name) {
    return person.company_name;
  }
  const parts = [person.first_name, person.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Хэрэглэгч";
}

/**
 * Получает инициалы пользователя для аватарки
 * Для компаний - первые 2 буквы названия
 * Для пользователей - первая буква имени + первая буква фамилии
 */
export function getPersonInitials(person: PersonInfo): string {
  if (person.is_company && person.company_name) {
    return person.company_name.slice(0, 2).toUpperCase();
  }
  const firstInitial = person.first_name?.charAt(0)?.toUpperCase() || "";
  const lastInitial = person.last_name?.charAt(0)?.toUpperCase() || "";
  return firstInitial + lastInitial || "?";
}

export function getListingImage(listing: RequestWithRelations["listing"]): string {
  const coverImage = listing.images?.find((img) => img.is_cover);
  return coverImage?.url || listing.images?.[0]?.url || "/images/placeholder-listing.svg";
}

export function formatPreferredDateTime(date: Date | null, time: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  const dateStr = d.toLocaleDateString("mn-MN", {
    month: "short",
    day: "numeric",
  });
  if (time) {
    return `${dateStr}, ${time}`;
  }
  return dateStr;
}

/**
 * Проверяет, просрочена ли заявка
 *
 * Правила:
 * - pending: истекает за 5 часов до назначенного времени начала
 *   (если нет preferred_date/time - не истекает автоматически)
 * - accepted: просрочена если прошло 2 часа после назначенного времени
 */
export interface OverdueInfo {
  isOverdue: boolean;
  hoursOverdue: number;
  deadlineType: "response" | "start" | null;
  message: string | null;
}

export function checkRequestOverdue(
  status: RequestStatus,
  createdAt: Date | string,
  preferredDate: Date | string | null,
  preferredTime: string | null
): OverdueInfo {
  const now = new Date();

  // Pending: истекает за 5 часов до начала работы
  if (status === "pending" && preferredDate) {
    const prefDate = new Date(preferredDate);

    if (preferredTime) {
      const [hours, minutes] = preferredTime.split(":").map(Number);
      prefDate.setHours(hours, minutes, 0, 0);
    } else {
      prefDate.setHours(9, 0, 0, 0); // Default to 9:00 AM
    }

    // Дедлайн для принятия: за 5 часов до начала
    const deadline = new Date(prefDate.getTime() - 5 * 60 * 60 * 1000);
    const hoursOverdue = Math.floor((now.getTime() - deadline.getTime()) / (60 * 60 * 1000));

    if (now > deadline) {
      return {
        isOverdue: true,
        hoursOverdue: Math.max(0, hoursOverdue),
        deadlineType: "response",
        message: "Хугацаа дууссан",
      };
    }

    // Check if close to deadline (less than 2 hours left to accept)
    const hoursLeft = Math.floor((deadline.getTime() - now.getTime()) / (60 * 60 * 1000));
    if (hoursLeft < 2) {
      const minutesLeft = Math.floor((deadline.getTime() - now.getTime()) / (60 * 1000));
      return {
        isOverdue: false,
        hoursOverdue: 0,
        deadlineType: "response",
        message: minutesLeft > 60 ? `${hoursLeft} цаг үлдлээ` : `${minutesLeft} мин үлдлээ`,
      };
    }
  }

  // Accepted: 2 часа после назначенного времени
  if (status === "accepted" && preferredDate) {
    const prefDate = new Date(preferredDate);

    if (preferredTime) {
      const [hours, minutes] = preferredTime.split(":").map(Number);
      prefDate.setHours(hours, minutes, 0, 0);
    } else {
      prefDate.setHours(9, 0, 0, 0); // Default to 9:00 AM
    }

    const deadline = new Date(prefDate.getTime() + 2 * 60 * 60 * 1000);
    const hoursOverdue = Math.floor((now.getTime() - deadline.getTime()) / (60 * 60 * 1000));

    if (now > deadline) {
      return {
        isOverdue: true,
        hoursOverdue: Math.max(0, hoursOverdue),
        deadlineType: "start",
        message: "Ажил эхлэх хугацаа хэтэрсэн",
      };
    }

    // Check if work should have started (past preferred time but within grace period)
    if (now > prefDate) {
      const minutesLeft = Math.floor((deadline.getTime() - now.getTime()) / (60 * 1000));
      return {
        isOverdue: false,
        hoursOverdue: 0,
        deadlineType: "start",
        message: `Ажил эхлэх ёстой! ${minutesLeft} мин үлдлээ`,
      };
    }
  }

  return {
    isOverdue: false,
    hoursOverdue: 0,
    deadlineType: null,
    message: null,
  };
}

/**
 * Проверяет, должна ли заявка отображаться в "Явагдаж буй" табе
 *
 * Условия:
 * - in_progress: всегда
 * - accepted: если preferred_date наступила или сегодня
 */
export function shouldShowInActiveJobs(
  status: RequestStatus,
  preferredDate: Date | string | null
): boolean {
  if (status === "in_progress") return true;

  if (status === "accepted" && preferredDate) {
    const now = new Date();
    const prefDate = new Date(preferredDate);

    // Set both to start of day for comparison
    now.setHours(0, 0, 0, 0);
    prefDate.setHours(0, 0, 0, 0);

    // Show if preferred date is today or in the past
    return prefDate <= now;
  }

  return false;
}

/**
 * Проверяет, доступен ли чат для заявки
 *
 * Условия:
 * - Статус: in_progress, awaiting_*, completed - чат всегда доступен
 * - Если accepted: за 2 часа до начала работы или позже
 * - Чат НЕ доступен: pending, rejected, cancelled_*, disputed, expired
 */
export function isChatAvailable(
  status: RequestStatus,
  preferredDate: Date | string | null,
  preferredTime: string | null
): { available: boolean; message: string | null } {
  // Chat NOT available for these terminal/cancelled statuses
  const chatUnavailableStatuses = [
    "pending",
    "rejected",
    "cancelled_by_client",
    "cancelled_by_provider",
    "disputed",
    "expired",
  ];

  if (chatUnavailableStatuses.includes(status)) {
    return { available: false, message: null };
  }

  // Chat available for in_progress, all completion flow statuses, and completed
  const chatAlwaysAvailableStatuses = [
    "in_progress",
    "awaiting_client_confirmation",
    "awaiting_completion_details",
    "awaiting_payment",
    "completed",
  ];

  if (chatAlwaysAvailableStatuses.includes(status)) {
    return { available: true, message: null };
  }

  // Чат доступен сразу после принятия заявки
  if (status === "accepted") {
    return { available: true, message: null };
  }

  return { available: false, message: null };
}
