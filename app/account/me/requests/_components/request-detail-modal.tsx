"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  X,
  Check,
  Calendar,
  MapPin,
  User,
  Play,
  CheckCircle,
  MessageSquare,
  Loader2,
  ImageIcon,
  ZoomIn,
  MessageCircle,
  Clock,
  CreditCard,
  Phone,
  Eye,
  EyeOff,
  Banknote,
} from "lucide-react";
import type { RequestWithRelations, RequestActions } from "./types";
import { getStatusBadge, getPersonName, getListingImage, formatCreatedAt, isChatAvailable } from "./utils";
import { RequestChat } from "./request-chat";
import {
  ClientReviewForm,
  ProviderCompletionForm,
  QRPaymentModal,
  CompletionSuccessModal,
} from "./work-completion-flow";
import { PriceProposalModal } from "./price-proposal-modal";

// Lazy load RequestLocationMap - карта локации заявки
const RequestLocationMap = dynamic(
  () => import("@/components/request-location-map").then((mod) => ({ default: mod.RequestLocationMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-50 bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// Lazy load LiveTrackingMap - карта с live отслеживанием
const LiveTrackingMap = dynamic(
  () => import("@/components/live-tracking-map").then((mod) => ({ default: mod.LiveTrackingMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-75 bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// Lazy load ElapsedTimeCounter
const ElapsedTimeCounter = dynamic(
  () => import("@/components/elapsed-time-counter").then((mod) => ({ default: mod.ElapsedTimeCounter })),
  { ssr: false }
);


interface RequestDetailModalProps {
  request: RequestWithRelations;
  userId: string;
  actions: RequestActions;
  onClose: () => void;
  autoOpenChat?: boolean;
  onChatOpened?: () => void;
  autoOpenCompletionForm?: boolean;
  onCompletionFormOpened?: () => void;
  autoOpenQRPayment?: boolean;
  onQRPaymentOpened?: () => void;
  // Price negotiation handlers
  onProposePrice?: (requestId: string, price: number) => void;
  onConfirmPrice?: (requestId: string) => void;
  onRejectPrice?: (requestId: string) => void;
}

export const RequestDetailModal = React.memo(function RequestDetailModal({
  request,
  userId,
  actions,
  onClose,
  autoOpenChat = false,
  onChatOpened,
  autoOpenCompletionForm = false,
  onCompletionFormOpened,
  autoOpenQRPayment = false,
  onQRPaymentOpened,
  onProposePrice,
  onConfirmPrice,
  onRejectPrice,
}: RequestDetailModalProps) {
  const [showImagePreview, setShowImagePreview] = React.useState(false);
  const [showChat, setShowChat] = React.useState(false);
  const [showCompletionPhoto, setShowCompletionPhoto] = React.useState<string | null>(null);
  const [showClientPhone, setShowClientPhone] = React.useState(false);
  const [showProviderPhone, setShowProviderPhone] = React.useState(false);

  // Completion flow states
  const [showClientReview, setShowClientReview] = React.useState(false);
  const [showProviderForm, setShowProviderForm] = React.useState(autoOpenCompletionForm);
  const [showQRPayment, setShowQRPayment] = React.useState(autoOpenQRPayment);
  const [showCompletionSuccess, setShowCompletionSuccess] = React.useState(false);

  // Price negotiation state
  const [showPriceModal, setShowPriceModal] = React.useState(false);

  // Check if listing is negotiable
  const isNegotiable = request.listing.is_negotiable === true;

  // Auto-open completion form if requested
  React.useEffect(() => {
    if (autoOpenCompletionForm && !showProviderForm) {
      setShowProviderForm(true);
      onCompletionFormOpened?.();
    }
  }, [autoOpenCompletionForm, showProviderForm, onCompletionFormOpened]);

  // Auto-open QR payment if requested
  React.useEffect(() => {
    if (autoOpenQRPayment && !showQRPayment) {
      setShowQRPayment(true);
      onQRPaymentOpened?.();
    }
  }, [autoOpenQRPayment, showQRPayment, onQRPaymentOpened]);

  // Auto-open chat if requested (from notification)
  React.useEffect(() => {
    if (autoOpenChat && !showChat) {
      const chatStatus = isChatAvailable(
        request.status,
        request.preferred_date,
        request.preferred_time
      );
      if (chatStatus.available) {
        setShowChat(true);
        onChatOpened?.();
      }
    }
  }, [autoOpenChat, showChat, request.status, request.preferred_date, request.preferred_time, onChatOpened]);
  const isMyRequest = request.client_id === userId;
  const isProvider = request.provider_id === userId;
  const otherPerson = isMyRequest ? request.provider : request.client;

  // Check if chat is available
  const chatStatus = isChatAvailable(
    request.status,
    request.preferred_date,
    request.preferred_time
  );

  return (
    <div
      className="fixed inset-x-0 top-0 bottom-21.5 md:bottom-0 md:inset-0 bg-black/50 z-100 flex items-stretch md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-background w-full h-full md:h-auto md:max-w-2xl md:rounded-xl md:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 bg-background border-b p-3 md:p-4 flex items-center justify-between md:rounded-t-xl">
          <h3 className="font-semibold text-base md:text-lg">Хүсэлтийн дэлгэрэнгүй</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 md:h-10 md:w-10">
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
          {/* Service Info */}
          <div className="flex gap-3 md:gap-4">
            <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-xl overflow-hidden shrink-0">
              <Image
                src={getListingImage(request.listing)}
                alt={request.listing.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/services/${request.listing.slug}`}
                  className="font-semibold text-sm md:text-lg hover:underline line-clamp-2"
                >
                  {request.listing.title}
                </Link>
              </div>
              {/* Price display */}
              <div className="mt-1 text-sm font-medium">
                {request.proposed_price ? (
                  <span className="text-purple-600 dark:text-purple-400">
                    {Number(request.proposed_price).toLocaleString()}₮
                  </span>
                ) : isNegotiable ? (
                  <span className="text-amber-600 dark:text-amber-400">Тохиролцоно</span>
                ) : request.listing.price ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {Number(request.listing.price).toLocaleString()}₮
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 md:mt-2">
                {getStatusBadge(request.status, isMyRequest ? "sent" : "received")}
              </div>
            </div>
          </div>

          {/* Chat Button - available on ALL active stages */}
          {(request.status === "pending" ||
            request.status === "price_proposed" ||
            request.status === "accepted" ||
            request.status === "in_progress" ||
            request.status === "awaiting_client_confirmation" ||
            request.status === "awaiting_completion_details" ||
            request.status === "awaiting_payment" ||
            request.status === "completed") && (
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-3 md:p-4 text-white shadow-lg">
              <div className="flex items-center justify-between gap-2 md:gap-3">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm md:text-base">Чат</p>
                    {chatStatus.available ? (
                      <p className="text-xs md:text-sm text-white/90 truncate">
                        Мессеж бичих боломжтой
                      </p>
                    ) : chatStatus.message ? (
                      <p className="text-xs md:text-sm text-white/80 flex items-center gap-1 truncate">
                        <Clock className="h-3 w-3 shrink-0" />
                        {chatStatus.message}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="default"
                  onClick={() => setShowChat(true)}
                  disabled={!chatStatus.available}
                  className="font-semibold shadow-md shrink-0 h-9 md:h-10 px-3 md:px-4 text-sm"
                >
                  <MessageCircle className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">Чат нээх</span>
                  <span className="sm:hidden">Нээх</span>
                </Button>
              </div>
            </div>
          )}

          {/* Client Request Details - фото и сообщение */}
          {(request.image_url || request.message) && (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
              {/* Заголовок секции */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Захиалагчийн хүсэлт
                </p>
              </div>

              {/* Фото клиента */}
              {request.image_url && (
                <button
                  type="button"
                  onClick={() => setShowImagePreview(true)}
                  className="relative w-full aspect-video group cursor-zoom-in"
                >
                  <Image
                    src={request.image_url}
                    alt="Хүсэлтийн зураг"
                    fill
                    className="object-cover"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
                  {/* Zoom button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-full p-3 shadow-xl transform scale-90 group-hover:scale-100 transition-transform duration-200">
                      <ZoomIn className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                    </div>
                  </div>
                  {/* Image indicator */}
                  <div className="absolute bottom-3 left-3">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <ImageIcon className="h-3 w-3 text-white" />
                      <span className="text-xs text-white font-medium">Зураг</span>
                    </div>
                  </div>
                </button>
              )}

              {/* Сообщение клиента */}
              {request.message && (
                <div className={`p-4 ${request.image_url ? "border-t border-slate-100 dark:border-slate-800" : ""}`}>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {request.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Provider Response */}
          {request.provider_response && (
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Хариу</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {request.provider_response}
              </p>
            </div>
          )}

          {/* Work Completion Report - shown after provider submits */}
          {request.completion_description && (
            <div className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-emerald-200 dark:border-emerald-800 bg-emerald-100/50 dark:bg-emerald-900/30">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Ажлын тайлан
                </p>
              </div>
              <div className="p-3">
                {/* Completion Photos */}
                {request.completion_photos && request.completion_photos.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Зураг ({request.completion_photos.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {request.completion_photos.map((photoUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setShowCompletionPhoto(photoUrl)}
                          className="relative aspect-square rounded-lg overflow-hidden group cursor-zoom-in border border-emerald-200 dark:border-emerald-800"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoUrl}
                            alt={`Ажлын зураг ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
                              <ZoomIn className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-emerald-200 dark:border-emerald-800 my-3" />
                  </>
                )}
                {/* Completion Description */}
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Тайлбар
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {request.completion_description}
                </p>
              </div>
            </div>
          )}

          {/* Client Review - shown after client confirms completion */}
          {request.review && (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Үйлчлүүлэгчийн үнэлгээ
                </p>
              </div>
              <div className="p-4">
                {/* Rating display - modern style */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Large rating number */}
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-3xl font-bold text-foreground">{request.review.rating}</span>
                      <span className="text-lg text-muted-foreground">/5</span>
                    </div>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= request.review!.rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-200 dark:text-slate-700 fill-slate-200 dark:fill-slate-700"
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  {/* Rating label */}
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    request.review.rating >= 4
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                      : request.review.rating >= 3
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  }`}>
                    {request.review.rating >= 5 ? "Маш сайн" :
                     request.review.rating >= 4 ? "Сайн" :
                     request.review.rating >= 3 ? "Дунд" :
                     request.review.rating >= 2 ? "Муу" : "Маш муу"}
                  </span>
                </div>
                {/* Comment */}
                {request.review.comment && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      "{request.review.comment}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Илгээсэн</span>
              </div>
              <p className="text-sm font-medium">{formatCreatedAt(request.created_at)}</p>
            </div>
            {request.accepted_at && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Check className="h-4 w-4" />
                  <span className="text-xs">Зөвшөөрсөн</span>
                </div>
                <p className="text-sm font-medium">
                  {formatCreatedAt(request.accepted_at)}
                </p>
              </div>
            )}
            {request.completed_at && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs">Дууссан</span>
                </div>
                <p className="text-sm font-medium">
                  {formatCreatedAt(request.completed_at)}
                </p>
              </div>
            )}
          </div>

          {/* Person Info */}
          <div className="border rounded-lg p-3 md:p-4">
            <p className="text-xs text-muted-foreground mb-2">
              {isMyRequest ? "Үйлчилгээ үзүүлэгч" : "Захиалагч"}
            </p>
            {/* Desktop: single row with buttons right, Mobile: stacked */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Avatar + Name + Phone */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-muted shrink-0">
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
                      <User className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm md:text-base">{getPersonName(otherPerson)}</p>
                  {/* Client Phone - только для провайдера */}
                  {isProvider && request.client_phone && (
                    <button
                      type="button"
                      onClick={() => setShowClientPhone(!showClientPhone)}
                      className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                    >
                      <Phone className="h-3 w-3 md:h-3.5 md:w-3.5" />
                      {showClientPhone ? (
                        <>
                          <span>+976 {request.client_phone.slice(0, 4)}-{request.client_phone.slice(4)}</span>
                          <EyeOff className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </>
                      ) : (
                        <>
                          <span>+976 </span>
                          <span className="blur-sm select-none">{request.client_phone.slice(0, 4)}-{request.client_phone.slice(4)}</span>
                          <Eye className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </>
                      )}
                    </button>
                  )}
                  {/* Provider Phone - только для клиента */}
                  {isMyRequest && request.listing.phone && (
                    <button
                      type="button"
                      onClick={() => setShowProviderPhone(!showProviderPhone)}
                      className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                    >
                      <Phone className="h-3 w-3 md:h-3.5 md:w-3.5" />
                      {showProviderPhone ? (
                        <>
                          <span>+976 {request.listing.phone.slice(0, 4)}-{request.listing.phone.slice(4)}</span>
                          <EyeOff className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </>
                      ) : (
                        <>
                          <span>+976 </span>
                          <span className="blur-sm select-none">{request.listing.phone.slice(0, 4)}-{request.listing.phone.slice(4)}</span>
                          <Eye className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {/* Buttons - full width on mobile, inline on desktop */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Call Button for Provider - только когда номер раскрыт */}
                {isProvider && request.client_phone && showClientPhone && (
                  <a href={`tel:+976${request.client_phone}`} className="flex-1 md:flex-initial">
                    <Button variant="default" size="sm" className="w-full md:w-auto bg-green-600 hover:bg-green-700 h-9">
                      <Phone className="h-4 w-4 mr-1.5" />
                      Залгах
                    </Button>
                  </a>
                )}
                {/* Call Button for Client - только когда номер раскрыт */}
                {isMyRequest && request.listing.phone && showProviderPhone && (
                  <a href={`tel:+976${request.listing.phone}`} className="flex-1 md:flex-initial">
                    <Button variant="default" size="sm" className="w-full md:w-auto bg-green-600 hover:bg-green-700 h-9">
                      <Phone className="h-4 w-4 mr-1.5" />
                      Залгах
                    </Button>
                  </a>
                )}
                <Link href={`/account/${otherPerson.id}`} className="flex-1 md:flex-initial">
                  <Button variant="outline" size="sm" className="w-full md:w-auto h-9">
                    Профайл
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Location Map - показываем карту с координатами */}
          {/* remote услуги: показываем координаты исполнителя (из listing) */}
          {/* on_site услуги: показываем координаты клиента (из request) */}
          {(() => {
            const isRemote = request.listing.service_type === "remote";
            // Для remote - координаты из listing (исполнителя)
            // Для on_site - координаты из request (клиента)
            const lat = isRemote ? request.listing.latitude : request.latitude;
            const lng = isRemote ? request.listing.longitude : request.longitude;
            const hasCoordinates = lat != null && lng != null;

            // Определяем текст адреса
            const addressText = isRemote
              ? request.listing.address || "Гүйцэтгэгчийн байршил"
              : request.address_detail ||
                [request.aimag?.name, request.district?.name, request.khoroo?.name]
                  .filter(Boolean)
                  .join(", ") ||
                "Захиалагчийн байршил";

            // Показываем LiveTrackingMap для активных on_site заявок
            const isActiveOnSite = !isRemote && ["in_progress", "awaiting_client_confirmation", "awaiting_completion_details", "awaiting_payment"].includes(request.status);

            if (!hasCoordinates) {
              // Нет координат - показываем только текст
              return (
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {isRemote ? "Гүйцэтгэгчийн хаяг" : "Захиалагчийн хаяг"}
                  </p>
                  <p className="text-sm font-medium">{addressText}</p>
                </div>
              );
            }

            // Live tracking карта для активных on_site заявок
            if (isActiveOnSite) {
              return (
                <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
                  {/* Header с информацией */}
                  <div className="px-4 py-3 border-b border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Байршлыг бодит цагаар хянах
                        </span>
                      </div>
                      {/* Счётчик времени */}
                      {request.started_at && (
                        <ElapsedTimeCounter startedAt={request.started_at} size="sm" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{addressText}</p>
                  </div>
                  {/* LiveTrackingMap */}
                  <LiveTrackingMap
                    requestId={request.id}
                    clientId={request.client_id}
                    providerId={request.provider_id}
                    clientName={getPersonName(request.client)}
                    providerName={getPersonName(request.provider)}
                    serviceLocation={{
                      latitude: lat as number,
                      longitude: lng as number,
                    }}
                    isActiveJob={request.status === "in_progress"}
                  />
                </div>
              );
            }

            // Обычная статичная карта для других случаев
            return (
              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {isRemote ? "Гүйцэтгэгчийн байршил" : "Захиалагчийн байршил"}
                  </p>
                  <p className="text-sm font-medium">{addressText}</p>
                </div>
                {/* Карта с координатами */}
                <RequestLocationMap
                  coordinates={[lat as number, lng as number]}
                  status={request.status}
                  addressText={addressText}
                  isClient={isMyRequest}
                />
              </div>
            );
          })()}

        </div>

        {/* Modal Footer */}
        <div className="shrink-0 bg-background border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:p-4 md:pb-4 md:rounded-b-xl">
          {/* Actions for INCOMING pending requests (я provider) */}
          {isProvider && request.status === "pending" && (
            <div className="flex gap-2 md:gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20 h-9 md:h-10 text-sm"
                onClick={() => actions.onReject(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                )}
                Татгалзах
              </Button>
              {/* For negotiable listings - show price proposal button */}
              {isNegotiable ? (
                <Button
                  size="sm"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 h-9 md:h-10 text-sm"
                  onClick={() => setShowPriceModal(true)}
                  disabled={actions.isUpdating}
                >
                  <Banknote className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  Үнэ санал болгох
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 h-9 md:h-10 text-sm"
                  onClick={() => actions.onAccept(request.id)}
                  disabled={actions.isUpdating}
                >
                  {actions.isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  )}
                  Хүлээн авах
                </Button>
              )}
            </div>
          )}

          {/* Provider: price_proposed - waiting for client */}
          {isProvider && request.status === "price_proposed" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-purple-700 dark:text-purple-300">
                  Санал болгосон үнэ: <span className="font-semibold">{Number(request.proposed_price).toLocaleString()}₮</span> — Хүлээгдэж байна
                </span>
              </div>
              <Button variant="outline" size="sm" className="h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
            </div>
          )}

          {/* Actions for ACCEPTED requests (provider can start work or cancel) */}
          {isProvider && request.status === "accepted" && (
            <div className="flex gap-2 md:gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 h-9 md:h-10 text-sm"
                onClick={() => actions.onCancelByProvider(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                )}
                Цуцлах
              </Button>
              <Button
                size="sm"
                className="flex-1 h-9 md:h-10 text-sm"
                onClick={() => actions.onStartWork(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                )}
                <span className="hidden sm:inline">Ажил эхлүүлэх</span>
                <span className="sm:hidden">Эхлүүлэх</span>
              </Button>
            </div>
          )}

          {/* Actions for IN_PROGRESS requests (provider can initiate completion) */}
          {isProvider && request.status === "in_progress" && (
            <div className="flex gap-2 md:gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9 md:h-10 text-sm"
                onClick={() => setShowProviderForm(true)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                )}
                Дуусгах
              </Button>
            </div>
          )}

          {/* AWAITING_COMPLETION_DETAILS: Provider must submit completion report */}
          {isProvider && request.status === "awaiting_completion_details" && (
            <div className="flex gap-2 md:gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 md:h-10 text-sm"
                onClick={() => setShowProviderForm(true)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                )}
                Тайлан илгээх
              </Button>
            </div>
          )}

          {/* AWAITING_COMPLETION_DETAILS: Client waiting for provider report */}
          {isMyRequest && request.status === "awaiting_completion_details" && (
            <div className="flex flex-col gap-2">
              <div className="p-2.5 md:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs md:text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  Гүйцэтгэгч ажлын тайлан илгээхийг хүлээж байна...
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
            </div>
          )}

          {/* AWAITING_CLIENT_CONFIRMATION: Client can confirm and leave review */}
          {isMyRequest && request.status === "awaiting_client_confirmation" && (
            <div className="flex gap-2 md:gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9 md:h-10 text-sm"
                onClick={() => setShowClientReview(true)}
                disabled={actions.isUpdating}
              >
                <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Баталгаажуулах
              </Button>
            </div>
          )}

          {/* AWAITING_CLIENT_CONFIRMATION: Provider waiting for client */}
          {isProvider && request.status === "awaiting_client_confirmation" && (
            <div className="flex flex-col gap-2">
              <div className="p-2.5 md:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs md:text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  Захиалагч баталгаажуулахыг хүлээж байна...
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
            </div>
          )}

          {/* AWAITING_PAYMENT: Provider shows QR code */}
          {isProvider && request.status === "awaiting_payment" && (
            <div className="flex gap-2 md:gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-purple-600 hover:bg-purple-700 h-9 md:h-10 text-sm"
                onClick={() => setShowQRPayment(true)}
                disabled={actions.isUpdating}
              >
                <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Төлбөр авах
              </Button>
            </div>
          )}

          {/* AWAITING_PAYMENT: Client waiting for payment */}
          {isMyRequest && request.status === "awaiting_payment" && (
            <div className="flex flex-col gap-2">
              <div className="p-2.5 md:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs md:text-sm text-purple-800 dark:text-purple-200 flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  Төлбөр төлөхийг хүлээж байна...
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
            </div>
          )}

          {/* Actions for MY pending requests (я client - могу отменить) */}
          {isMyRequest && request.status === "pending" && (
            <div className="flex gap-2 md:gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-9 md:h-10 text-sm"
                onClick={() => actions.onCancelByClient(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                )}
                Цуцлах
              </Button>
            </div>
          )}

          {/* Client: price_proposed - confirm or reject price */}
          {isMyRequest && request.status === "price_proposed" && request.proposed_price && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                <Banknote className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Санал болгосон үнэ: {Number(request.proposed_price).toLocaleString()}₮
                </span>
              </div>
              <div className="flex gap-2 md:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20 h-9 md:h-10 text-sm"
                  onClick={() => onRejectPrice?.(request.id)}
                  disabled={actions.isUpdating}
                >
                  {actions.isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  )}
                  Татгалзах
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 h-9 md:h-10 text-sm"
                  onClick={() => onConfirmPrice?.(request.id)}
                  disabled={actions.isUpdating}
                >
                  {actions.isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  )}
                  Зөвшөөрөх
                </Button>
              </div>
            </div>
          )}

          {/* Client: accepted - can cancel (NOT in_progress!) */}
          {isMyRequest && request.status === "accepted" && (
            <div className="flex gap-2 md:gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20 h-9 md:h-10 text-sm"
                onClick={() => actions.onCancelByClient(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                )}
                Цуцлах
              </Button>
            </div>
          )}

          {/* Client: in_progress - just close button (work is ongoing) */}
          {isMyRequest && request.status === "in_progress" && (
            <div className="flex gap-2 md:gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
            </div>
          )}

          {/* Default close button for other states */}
          {((isMyRequest && !["pending", "price_proposed", "awaiting_client_confirmation", "awaiting_completion_details", "awaiting_payment", "accepted", "in_progress"].includes(request.status)) ||
            (isProvider &&
              ["rejected", "completed", "cancelled_by_client", "cancelled_by_provider", "disputed"].includes(
                request.status
              ))) && (
            <div className="flex gap-2 md:gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <RequestChat
          request={request}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Price Proposal Modal */}
      {showPriceModal && (
        <PriceProposalModal
          listingTitle={request.listing.title}
          onSubmit={(price) => {
            onProposePrice?.(request.id, price);
            setShowPriceModal(false);
          }}
          onClose={() => setShowPriceModal(false)}
          isSubmitting={actions.isUpdating}
        />
      )}

      {/* Full screen image preview */}
      {showImagePreview && request.image_url && (
        <div
          className="fixed inset-0 bg-black/95 z-200 flex items-center justify-center p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <button
            type="button"
            onClick={() => setShowImagePreview(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <div className="relative w-full max-w-4xl max-h-[90vh] aspect-auto">
            <Image
              src={request.image_url}
              alt="Хүсэлтийн зураг"
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Full screen completion photo preview */}
      {showCompletionPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-200 flex items-center justify-center p-4"
          onClick={() => setShowCompletionPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setShowCompletionPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={showCompletionPhoto}
            alt="Ажлын зураг"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Client Review Form Modal */}
      {showClientReview && (
        <ClientReviewForm
          request={request}
          onSubmit={async (rating, comment) => {
            await actions.onClientConfirmCompletion(request.id, rating, comment);
            setShowClientReview(false);
            onClose(); // Close modal, payment step is next for provider
          }}
          onClose={() => setShowClientReview(false)}
          isSubmitting={actions.isUpdating}
        />
      )}

      {/* Provider Completion Details Form Modal */}
      {showProviderForm && (
        <ProviderCompletionForm
          request={request}
          onSubmit={async (description, photoUrls) => {
            await actions.onProviderSubmitDetails(request.id, description, photoUrls);
            setShowProviderForm(false);
            onClose();
          }}
          onClose={() => setShowProviderForm(false)}
          isSubmitting={actions.isUpdating}
        />
      )}

      {/* QR Payment Modal */}
      {showQRPayment && (
        <QRPaymentModal
          request={request}
          onPaymentComplete={async () => {
            await actions.onPaymentComplete(request.id);
            setShowQRPayment(false);
            setShowCompletionSuccess(true);
          }}
          onClose={() => setShowQRPayment(false)}
          isProcessing={actions.isUpdating}
        />
      )}

      {/* Completion Success Modal */}
      {showCompletionSuccess && (
        <CompletionSuccessModal
          isProvider={isProvider}
          onClose={() => {
            setShowCompletionSuccess(false);
            onClose();
          }}
        />
      )}
    </div>
  );
});
