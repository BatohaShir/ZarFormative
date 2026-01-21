"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Calendar, User, X, Check } from "lucide-react";
import type { RequestWithRelations } from "./types";
import {
  getStatusBadge,
  getPersonName,
  getListingImage,
  formatPreferredDateTime,
} from "./utils";

interface RequestListItemProps {
  request: RequestWithRelations;
  type: "sent" | "received";
  onSelect: (request: RequestWithRelations) => void;
  onAccept?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onCancelByClient?: (requestId: string) => void;
  onCancelByProvider?: (requestId: string) => void;
  isUpdating?: boolean;
}

// Мемоизированный компонент для предотвращения лишних ре-рендеров
export const RequestListItem = React.memo(function RequestListItem({
  request,
  type,
  onSelect,
  onAccept,
  onReject,
  onCancelByClient,
  onCancelByProvider,
  isUpdating = false,
}: RequestListItemProps) {
  const isMyRequest = type === "sent";
  const otherPerson = isMyRequest ? request.provider : request.client;
  const preferredDateTime = formatPreferredDateTime(request.preferred_date, request.preferred_time);

  const handleClick = React.useCallback(() => {
    onSelect(request);
  }, [onSelect, request]);

  const handleAccept = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAccept?.(request.id);
  }, [onAccept, request.id]);

  const handleReject = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onReject?.(request.id);
  }, [onReject, request.id]);

  const handleCancelByClient = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCancelByClient?.(request.id);
  }, [onCancelByClient, request.id]);

  const handleCancelByProvider = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCancelByProvider?.(request.id);
  }, [onCancelByProvider, request.id]);

  return (
    <div
      className="group bg-card border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex gap-3 p-3">
        {/* Image */}
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden shrink-0">
          <Image
            src={getListingImage(request.listing)}
            alt={request.listing.title}
            fill
            className="object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title & Status */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm line-clamp-1">
              {request.listing.title}
            </h3>
            <div className="shrink-0">
              {getStatusBadge(request.status, type)}
            </div>
          </div>

          {/* Person */}
          <div className="flex items-center gap-1.5 mb-1.5">
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
            <span className="text-xs text-muted-foreground line-clamp-1">
              {getPersonName(otherPerson)}
            </span>
          </div>

          {/* Date/Time & Message in one row */}
          <div className="flex items-center gap-3 text-xs">
            {preferredDateTime && (
              <span className="flex items-center gap-1 text-primary font-medium shrink-0">
                <Calendar className="h-3 w-3" />
                {preferredDateTime}
              </span>
            )}
            <span className="text-muted-foreground line-clamp-1 italic">
              &ldquo;{request.message}&rdquo;
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons for incoming pending */}
      {!isMyRequest && request.status === "pending" && (
        <div className="flex gap-2 px-3 pb-3 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
            onClick={handleReject}
            disabled={isUpdating}
          >
            <X className="h-3 w-3 mr-1" />
            Татгалзах
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
            onClick={handleAccept}
            disabled={isUpdating}
          >
            <Check className="h-3 w-3 mr-1" />
            Хүлээн авах
          </Button>
        </div>
      )}

      {/* Cancel button for sent pending requests (client cancels) */}
      {isMyRequest && request.status === "pending" && (
        <div className="px-3 pb-3 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
            onClick={handleCancelByClient}
            disabled={isUpdating}
          >
            <X className="h-3 w-3 mr-1" />
            Цуцлах
          </Button>
        </div>
      )}

      {/* Cancel button for received accepted requests (provider cancels) */}
      {!isMyRequest && request.status === "accepted" && (
        <div className="px-3 pb-3 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
            onClick={handleCancelByProvider}
            disabled={isUpdating}
          >
            <X className="h-3 w-3 mr-1" />
            Цуцлах
          </Button>
        </div>
      )}
    </div>
  );
});
