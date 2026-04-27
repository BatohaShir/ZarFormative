"use client";

import * as React from "react";
import Image from "next/image";
import {
  Calendar,
  User,
  X,
  Check,
  AlertTriangle,
  MessageCircle,
  Clock,
  MapPin,
  Banknote,
} from "lucide-react";
import type { RequestWithRelations } from "./types";
import { getStatusBadge, getPersonName, getListingImage, checkRequestOverdue } from "./utils";
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
  /**
   * Called on hover/touchstart so the parent can warm up the lazy
   * detail-modal chunk. By the time the user releases the click the
   * module is in memory and the modal opens without a loader frame.
   */
  onPrefetch?: () => void;
}

// Top status accent — semantic colors from design system
function getStatusAccent(status: string, isExpired: boolean): string {
  if (isExpired) return "bg-destructive";
  switch (status) {
    case "pending":
      return "bg-amber-500";
    case "price_proposed":
      return "bg-violet-500";
    case "accepted":
      return "bg-emerald-500";
    case "in_progress":
      return "bg-blue-500";
    case "completed":
      return "bg-emerald-500";
    case "rejected":
    case "cancelled_by_client":
    case "cancelled_by_provider":
      return "bg-muted-foreground/40";
    default:
      return "bg-muted-foreground/40";
  }
}

// Buttons — editorial pill style. Centralized so all action rows match.
const PRIMARY_BTN =
  "flex-1 h-9 px-4 rounded-full text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50";
const OUTLINE_DESTRUCTIVE_BTN =
  "flex-1 h-9 px-4 rounded-full text-xs font-semibold border border-border bg-card hover:bg-muted text-destructive transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50";
const OUTLINE_BTN =
  "flex-1 h-9 px-4 rounded-full text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50";

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
  onPrefetch,
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

  const formattedTime = request.preferred_time || null;

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

  const showChatButton = request.status === "accepted" || request.status === "in_progress";

  // Build address string
  const addressStr =
    request.listing.service_type === "remote"
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
        onMouseEnter={onPrefetch}
        onTouchStart={onPrefetch}
        onFocus={onPrefetch}
        style={{ transitionTimingFunction: "var(--ease-brand)" }}
        className={`relative w-full text-left bg-card rounded-2xl ring-1 ring-border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99] ${
          isExpired ? "ring-destructive/40" : ""
        }`}
      >
        {/* Status accent bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${getStatusAccent(request.status, isExpired)}`}
        />

        <div className="p-4 pt-5">
          {/* Overdue warning */}
          {isExpired && (
            <div className="mb-3 -mx-4 -mt-5 px-4 py-2 bg-destructive/5 border-b border-destructive/20">
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-medium">Хугацаа дууссан</span>
              </div>
            </div>
          )}

          {/* Near deadline warning */}
          {!isExpired && overdueInfo.message && request.status === "pending" && (
            <div className="mb-3 -mx-4 -mt-5 px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-medium">{overdueInfo.message}</span>
              </div>
            </div>
          )}

          {/* Status + Price */}
          <div className="flex items-center justify-between gap-2 mb-3">
            {getStatusBadge(request.status, type)}
            <div className="tabular">
              {request.proposed_price ? (
                <span className="font-display text-sm font-bold text-violet-600 dark:text-violet-400">
                  {Number(request.proposed_price).toLocaleString()}₮
                </span>
              ) : isNegotiable ? (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Тохиролцоно
                </span>
              ) : request.listing.price ? (
                <span className="font-display text-sm font-bold text-foreground">
                  {Number(request.listing.price).toLocaleString()}₮
                </span>
              ) : null}
            </div>
          </div>

          {/* Image + Title + Person */}
          <div className="flex items-center gap-3">
            <div
              className={`relative w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 ring-1 ring-border ${
                isExpired ? "opacity-60 grayscale" : ""
              }`}
            >
              <Image
                src={getListingImage(request.listing)}
                alt={request.listing.title}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3
                className={`font-display font-semibold text-sm leading-snug line-clamp-1 ${
                  isExpired ? "text-muted-foreground" : ""
                }`}
              >
                {request.listing.title}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{getPersonName(otherPerson)}</span>
              </div>
            </div>
          </div>

          {/* Message */}
          {request.message && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-1 pl-15">
              {request.message}
            </p>
          )}

          {/* Footer: Date/Time + Address */}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-xs text-muted-foreground tabular">
            <div className="flex items-center gap-3">
              {preferredDateStr && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-orange-500" />
                  {preferredDateStr}
                </span>
              )}
              {formattedTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-violet-500" />
                  {formattedTime}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 truncate min-w-0">
              <MapPin className="h-3 w-3 shrink-0 text-emerald-500" />
              <span className="truncate">{addressStr}</span>
            </span>
          </div>

          {/* Action buttons for incoming pending - hidden if expired */}
          {!isMyRequest && request.status === "pending" && !isExpired && (
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleReject}
                disabled={isUpdating}
                className={OUTLINE_DESTRUCTIVE_BTN}
              >
                <X className="h-3.5 w-3.5" />
                Татгалзах
              </button>
              {isNegotiable ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPriceModal(true);
                  }}
                  disabled={isUpdating}
                  className={PRIMARY_BTN}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Үнэ санал болгох
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={isUpdating}
                  className={PRIMARY_BTN}
                >
                  <Check className="h-3.5 w-3.5" />
                  Хүлээн авах
                </button>
              )}
            </div>
          )}

          {/* Cancel button for sent pending requests (client cancels) - hidden if expired */}
          {isMyRequest && request.status === "pending" && !isExpired && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleCancelByClient}
                disabled={isUpdating}
                className={OUTLINE_DESTRUCTIVE_BTN}
              >
                <X className="h-3.5 w-3.5" />
                Цуцлах
              </button>
            </div>
          )}

          {/* Client: Price proposed - show confirm/reject buttons */}
          {isMyRequest && request.status === "price_proposed" && request.proposed_price && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-center gap-2 px-3 py-2 bg-violet-500/5 rounded-xl ring-1 ring-violet-500/20">
                <Banknote className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-medium text-violet-700 dark:text-violet-300 tabular">
                  Санал болгосон үнэ: {Number(request.proposed_price).toLocaleString()}₮
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRejectPrice}
                  disabled={isUpdating}
                  className={OUTLINE_DESTRUCTIVE_BTN}
                >
                  <X className="h-3.5 w-3.5" />
                  Татгалзах
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPrice}
                  disabled={isUpdating}
                  className={PRIMARY_BTN}
                >
                  <Check className="h-3.5 w-3.5" />
                  Зөвшөөрөх
                </button>
              </div>
            </div>
          )}

          {/* Provider: Price proposed - waiting for client */}
          {!isMyRequest && request.status === "price_proposed" && request.proposed_price && (
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2 px-3 py-2 bg-violet-500/5 rounded-xl ring-1 ring-violet-500/20">
                <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-xs text-violet-700 dark:text-violet-300 tabular">
                  Санал болгосон үнэ:{" "}
                  <span className="font-semibold">
                    {Number(request.proposed_price).toLocaleString()}₮
                  </span>{" "}
                  — Хүлээгдэж байна
                </span>
              </div>
            </div>
          )}

          {/* Cancel button for received accepted requests (provider cancels) */}
          {!isMyRequest && request.status === "accepted" && (
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleCancelByProvider}
                disabled={isUpdating}
                className={OUTLINE_DESTRUCTIVE_BTN}
              >
                <X className="h-3.5 w-3.5" />
                Цуцлах
              </button>
              <button type="button" onClick={handleOpenChat} className={PRIMARY_BTN}>
                <MessageCircle className="h-3.5 w-3.5" />
                Чат
              </button>
            </div>
          )}

          {/* Chat button for in_progress (both client and provider) */}
          {showChatButton && request.status === "in_progress" && (
            <div className="mt-4">
              <button type="button" onClick={handleOpenChat} className={OUTLINE_BTN}>
                <MessageCircle className="h-3.5 w-3.5" />
                Чат нээх
              </button>
            </div>
          )}

          {/* Chat button for client on accepted status */}
          {isMyRequest && request.status === "accepted" && (
            <div className="mt-4">
              <button type="button" onClick={handleOpenChat} className={PRIMARY_BTN}>
                <MessageCircle className="h-3.5 w-3.5" />
                Чат нээх
              </button>
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
