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
