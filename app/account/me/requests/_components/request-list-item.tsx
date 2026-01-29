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
  Banknote,
} from "lucide-react";
import type { RequestWithRelations } from "./types";
import {
  getStatusBadge,
  getPersonName,
  getListingImage,
  checkRequestOverdue,
} from "./utils";
import { PriceProposalModal } from "./price-proposal-modal";

interface RequestListItemProps {
  request: RequestWithRelations;
  type: "sent" | "received";
  onSelect: (request: RequestWithRelations) => void;
  onOpenChat?: (request: RequestWithRelations) => void;
  onAccept?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onCancelByClient?: (requestId: string) => void;
  onCancelByProvider?: (requestId: string) => void;
  onProposePrice?: (requestId: string, price: number) => void;
  onConfirmPrice?: (requestId: string) => void;
  onRejectPrice?: (requestId: string) => void;
  isUpdating?: boolean;
}

// Get status color for top bar
function getStatusColor(status: string, isExpired: boolean): string {
  if (isExpired) return "bg-gradient-to-r from-red-500 to-red-400";
  switch (status) {
    case "pending":
      return "bg-gradient-to-r from-amber-500 to-orange-400";
    case "price_proposed":
      return "bg-gradient-to-r from-purple-500 to-violet-400";
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
  onProposePrice,
  onConfirmPrice,
  onRejectPrice,
  isUpdating = false,
}: RequestListItemProps) {
  const isMyRequest = type === "sent";
  const otherPerson = isMyRequest ? request.provider : request.client;

  // State for price proposal modal
  const [showPriceModal, setShowPriceModal] = React.useState(false);

  // Check if listing is negotiable
  const isNegotiable = request.listing.is_negotiable === true;

  // Check if request is expired (for pending requests)
  const overdueInfo = checkRequestOverdue(
    request.status,
    request.created_at,
    request.preferred_date,
    request.preferred_time
  );
  const isExpired = request.status === "pending" && overdueInfo.isOverdue;

  // Format preferred date - full date
  const preferredDateStr = request.preferred_date
    ? new Date(request.preferred_date).toLocaleDateString("mn-MN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  // Format time nicely
  const formattedTime = request.preferred_time
    ? request.preferred_time.replace(":", "᠄") // Mongolian colon for style
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

  const handleConfirmPrice = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onConfirmPrice?.(request.id);
    },
    [onConfirmPrice, request.id]
  );

  const handleRejectPrice = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRejectPrice?.(request.id);
    },
    [onRejectPrice, request.id]
  );

  // Show chat button for accepted or in_progress
  const showChatButton =
    request.status === "accepted" || request.status === "in_progress";

  // Build address string
  const addressStr = request.listing.service_type === "remote"
    ? request.listing.address || "—"
    : request.address_detail ||
      (request.aimag
        ? [request.aimag.name, request.district?.name, request.khoroo?.name]
            .filter(Boolean)
            .join(", ")
        : "—");

  return (
    <>
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

      <div className="px-3 py-2">
        {/* Overdue warning banner */}
        {isExpired && (
          <div className="mb-1.5 -mx-3 -mt-2 px-3 py-1 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="text-[11px] font-medium">Хугацаа дууссан</span>
            </div>
          </div>
        )}

        {/* Near deadline warning */}
        {!isExpired && overdueInfo.message && request.status === "pending" && (
          <div className="mb-1.5 -mx-3 -mt-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="text-[11px] font-medium">{overdueInfo.message}</span>
            </div>
          </div>
        )}

        {/* Row 1: Status + Price */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {getStatusBadge(request.status, type)}
          <div>
            {request.proposed_price ? (
              <span className="text-[13px] font-semibold text-purple-600 dark:text-purple-400">
                {Number(request.proposed_price).toLocaleString()}₮
              </span>
            ) : isNegotiable ? (
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Тохиролцоно</span>
            ) : request.listing.price ? (
              <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                {Number(request.listing.price).toLocaleString()}₮
              </span>
            ) : null}
          </div>
        </div>

        {/* Row 2: Image + Title + Person */}
        <div className="flex items-center gap-2">
          {/* Service image */}
          <div
            className={`relative w-10 h-10 rounded-md overflow-hidden shrink-0 ${
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

          {/* Title + Person */}
          <div className="min-w-0 flex-1">
            <h3 className={`font-medium text-[13px] truncate ${isExpired ? "text-muted-foreground" : ""}`}>
              {request.listing.title}
            </h3>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <User className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{getPersonName(otherPerson)}</span>
            </div>
          </div>
        </div>

        {/* Message */}
        {request.message && (
          <p className="mt-1.5 text-[11px] text-muted-foreground truncate pl-12">
            {request.message}
          </p>
        )}

        {/* Footer: Date/Time + Address - responsive */}
        <div className="mt-1.5 pl-12 text-[10px] text-muted-foreground">
          {/* Mobile: stack vertically, Desktop: single row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <div className="flex items-center gap-2">
              {preferredDateStr && (
                <span className="flex items-center gap-0.5">
                  <Calendar className="h-2.5 w-2.5 text-orange-500" />
                  {preferredDateStr}
                </span>
              )}
              {formattedTime && (
                <span className="flex items-center gap-0.5 bg-purple-100 dark:bg-purple-900/30 px-1 rounded text-purple-700 dark:text-purple-300">
                  <Clock className="h-2.5 w-2.5" />
                  {formattedTime}
                </span>
              )}
            </div>
            <span className="flex items-center gap-0.5 truncate">
              <MapPin className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
              <span className="truncate">{addressStr}</span>
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
            {/* For negotiable listings - show price proposal button */}
            {isNegotiable ? (
              <Button
                size="sm"
                className="flex-1 h-9 text-xs bg-purple-600 hover:bg-purple-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPriceModal(true);
                }}
                disabled={isUpdating}
              >
                <Banknote className="h-3.5 w-3.5 mr-1" />
                Үнэ санал болгох
              </Button>
            ) : (
              <Button
                size="sm"
                className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700"
                onClick={handleAccept}
                disabled={isUpdating}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Хүлээн авах
              </Button>
            )}
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

        {/* Client: Price proposed - show confirm/reject buttons */}
        {isMyRequest && request.status === "price_proposed" && request.proposed_price && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <Banknote className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Санал болгосон үнэ: {Number(request.proposed_price).toLocaleString()}₮
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
                onClick={handleRejectPrice}
                disabled={isUpdating}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Татгалзах
              </Button>
              <Button
                size="sm"
                className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700"
                onClick={handleConfirmPrice}
                disabled={isUpdating}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Зөвшөөрөх
              </Button>
            </div>
          </div>
        )}

        {/* Provider: Price proposed - waiting for client */}
        {!isMyRequest && request.status === "price_proposed" && request.proposed_price && (
          <div className="mt-3">
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-700 dark:text-purple-300">
                Санал болгосон үнэ: <span className="font-medium">{Number(request.proposed_price).toLocaleString()}₮</span> — Хүлээгдэж байна
              </span>
            </div>
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

    {/* Price Proposal Modal - rendered outside button */}
    {showPriceModal && (
      <PriceProposalModal
        listingTitle={request.listing.title}
        onSubmit={(price) => {
          onProposePrice?.(request.id, price);
          setShowPriceModal(false);
        }}
        onClose={() => setShowPriceModal(false)}
        isSubmitting={isUpdating}
      />
    )}
  </>
  );
});
