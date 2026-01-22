"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  User,
  X,
  Check,
  AlertTriangle,
  MessageCircle,
  Clock,
  MapPin,
  MessageSquare,
} from "lucide-react";
import type { RequestWithRelations } from "./types";
import {
  getStatusBadge,
  getPersonName,
  getListingImage,
  checkRequestOverdue,
} from "./utils";

interface RequestListItemProps {
  request: RequestWithRelations;
  type: "sent" | "received";
  onSelect: (request: RequestWithRelations) => void;
  onOpenChat?: (request: RequestWithRelations) => void;
  onAccept?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onCancelByClient?: (requestId: string) => void;
  onCancelByProvider?: (requestId: string) => void;
  isUpdating?: boolean;
}

// Get status color for top bar
function getStatusColor(status: string, isExpired: boolean): string {
  if (isExpired) return "bg-gradient-to-r from-red-500 to-red-400";
  switch (status) {
    case "pending":
      return "bg-gradient-to-r from-amber-500 to-orange-400";
    case "accepted":
      return "bg-gradient-to-r from-green-500 to-emerald-500";
    case "in_progress":
      return "bg-gradient-to-r from-blue-500 to-blue-400";
    case "completed":
      return "bg-gradient-to-r from-emerald-500 to-teal-500";
    case "rejected":
    case "cancelled_by_client":
    case "cancelled_by_provider":
      return "bg-gradient-to-r from-gray-400 to-gray-300";
    default:
      return "bg-gradient-to-r from-gray-400 to-gray-300";
  }
}

// Мемоизированный компонент для предотвращения лишних ре-рендеров
export const RequestListItem = React.memo(function RequestListItem({
  request,
  type,
  onSelect,
  onOpenChat,
  onAccept,
  onReject,
  onCancelByClient,
  onCancelByProvider,
  isUpdating = false,
}: RequestListItemProps) {
  const isMyRequest = type === "sent";
  const otherPerson = isMyRequest ? request.provider : request.client;

  // Check if request is expired (for pending requests)
  const overdueInfo = checkRequestOverdue(
    request.status,
    request.created_at,
    request.preferred_date,
    request.preferred_time
  );
  const isExpired = request.status === "pending" && overdueInfo.isOverdue;

  // Format preferred date
  const preferredDateStr = request.preferred_date
    ? new Date(request.preferred_date).toLocaleDateString("mn-MN", {
        month: "short",
        day: "numeric",
      })
    : null;

  const handleClick = React.useCallback(() => {
    onSelect(request);
  }, [onSelect, request]);

  const handleAccept = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAccept?.(request.id);
    },
    [onAccept, request.id]
  );

  const handleReject = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onReject?.(request.id);
    },
    [onReject, request.id]
  );

  const handleCancelByClient = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCancelByClient?.(request.id);
    },
    [onCancelByClient, request.id]
  );

  const handleCancelByProvider = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCancelByProvider?.(request.id);
    },
    [onCancelByProvider, request.id]
  );

  const handleOpenChat = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenChat?.(request);
    },
    [onOpenChat, request]
  );

  // Show chat button for accepted or in_progress
  const showChatButton =
    request.status === "accepted" || request.status === "in_progress";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative w-full text-left bg-card border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all ${
        isExpired ? "border-red-300 dark:border-red-800" : ""
      }`}
    >
      {/* Status indicator bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor(request.status, isExpired)}`}
      />

      <div className="p-3 pt-4">
        {/* Overdue warning banner */}
        {isExpired && (
          <div className="mb-2 -mx-3 -mt-4 px-3 py-2 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium">
                Хугацаа дууссан - хүлээн авагдаагүй
              </span>
            </div>
          </div>
        )}

        {/* Near deadline warning */}
        {!isExpired && overdueInfo.message && request.status === "pending" && (
          <div className="mb-2 -mx-3 -mt-4 px-3 py-2 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium">{overdueInfo.message}</span>
            </div>
          </div>
        )}

        {/* Top row: service info */}
        <div className="flex items-start gap-3">
          {/* Service image */}
          <div
            className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 ${
              isExpired ? "opacity-60 grayscale" : ""
            }`}
          >
            <Image
              src={getListingImage(request.listing)}
              alt={request.listing.title}
              fill
              className="object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`font-semibold text-sm line-clamp-1 ${isExpired ? "text-muted-foreground" : ""}`}
              >
                {request.listing.title}
              </h3>
              {getStatusBadge(request.status, type)}
            </div>

            {/* Person info */}
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <div className="relative w-5 h-5 rounded-full overflow-hidden bg-muted shrink-0">
                {otherPerson.avatar_url ? (
                  <Image
                    src={otherPerson.avatar_url}
                    alt=""
                    fill
                    unoptimized={otherPerson.avatar_url.includes("dicebear")}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
              <span>{isMyRequest ? "Гүйцэтгэгч" : "Захиалагч"}:</span>
              <span className="font-medium text-foreground truncate">
                {getPersonName(otherPerson)}
              </span>
            </div>
          </div>
        </div>

        {/* Message - compact */}
        {request.message && (
          <div className="mt-2 px-2 py-1.5 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3 shrink-0" />
              <span className="truncate">{request.message}</span>
            </p>
          </div>
        )}

        {/* Details row - inline */}
        <div className="flex items-center gap-3 mt-2 text-xs">
          {preferredDateStr && (
            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>{preferredDateStr}</span>
            </div>
          )}
          {request.preferred_time && (
            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{request.preferred_time}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {request.listing.service_type === "remote" &&
              request.listing.address
                ? request.listing.address
                : request.aimag
                  ? [
                      request.aimag.name,
                      request.district?.name,
                      request.khoroo?.name,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "—"}
            </span>
          </div>
        </div>

        {/* Action buttons for incoming pending - hidden if expired */}
        {!isMyRequest && request.status === "pending" && !isExpired && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
              onClick={handleReject}
              disabled={isUpdating}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Татгалзах
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700"
              onClick={handleAccept}
              disabled={isUpdating}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Хүлээн авах
            </Button>
          </div>
        )}

        {/* Cancel button for sent pending requests (client cancels) - hidden if expired */}
        {isMyRequest && request.status === "pending" && !isExpired && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
              onClick={handleCancelByClient}
              disabled={isUpdating}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Цуцлах
            </Button>
          </div>
        )}

        {/* Cancel button for received accepted requests (provider cancels) */}
        {!isMyRequest && request.status === "accepted" && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
              onClick={handleCancelByProvider}
              disabled={isUpdating}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Цуцлах
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 text-xs bg-indigo-600 hover:bg-indigo-700"
              onClick={handleOpenChat}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1" />
              Чат
            </Button>
          </div>
        )}

        {/* Chat button for in_progress (both client and provider) */}
        {showChatButton && request.status === "in_progress" && (
          <div className="mt-3">
            <Button
              size="sm"
              className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700"
              onClick={handleOpenChat}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1" />
              Чат нээх
            </Button>
          </div>
        )}

        {/* Chat button for client on accepted status */}
        {isMyRequest && request.status === "accepted" && (
          <div className="mt-3">
            <Button
              size="sm"
              className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700"
              onClick={handleOpenChat}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1" />
              Чат нээх
            </Button>
          </div>
        )}
      </div>
    </button>
  );
});
