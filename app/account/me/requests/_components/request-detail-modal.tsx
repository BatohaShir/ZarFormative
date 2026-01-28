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
  Trash2,
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


interface RequestDetailModalProps {
  request: RequestWithRelations;
  userId: string;
  actions: RequestActions;
  onClose: () => void;
  onDeleteRequest: () => void;
  autoOpenChat?: boolean;
  onChatOpened?: () => void;
  autoOpenCompletionForm?: boolean;
  onCompletionFormOpened?: () => void;
  autoOpenQRPayment?: boolean;
  onQRPaymentOpened?: () => void;
}

export const RequestDetailModal = React.memo(function RequestDetailModal({
  request,
  userId,
  actions,
  onClose,
  onDeleteRequest,
  autoOpenChat = false,
  onChatOpened,
  autoOpenCompletionForm = false,
  onCompletionFormOpened,
  autoOpenQRPayment = false,
  onQRPaymentOpened,
}: RequestDetailModalProps) {
  const [showImagePreview, setShowImagePreview] = React.useState(false);
  const [showChat, setShowChat] = React.useState(false);
  const [showCompletionPhoto, setShowCompletionPhoto] = React.useState<string | null>(null);
  const [showClientPhone, setShowClientPhone] = React.useState(false);

  // Completion flow states
  const [showClientReview, setShowClientReview] = React.useState(false);
  const [showProviderForm, setShowProviderForm] = React.useState(autoOpenCompletionForm);
  const [showQRPayment, setShowQRPayment] = React.useState(autoOpenQRPayment);
  const [showCompletionSuccess, setShowCompletionSuccess] = React.useState(false);

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
    <div className="fixed inset-x-0 top-0 bottom-21.5 md:bottom-0 md:inset-0 bg-black/50 z-100 flex items-stretch md:items-center justify-center">
      <div className="bg-background w-full h-full md:h-auto md:max-w-2xl md:rounded-xl md:max-h-[90vh] overflow-hidden flex flex-col">
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
              <div className="mt-1.5 md:mt-2">
                {getStatusBadge(request.status, isMyRequest ? "sent" : "received")}
              </div>
            </div>
          </div>

          {/* Chat Button - MOVED UP, prominent placement */}
          {(request.status === "accepted" ||
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

          {/* Client Image - показываем для всех */}
          {request.image_url && (
            <div className="border rounded-lg overflow-hidden">
              <p className="text-sm font-medium p-3 border-b bg-muted/30 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Зураг
              </p>
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
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-3">
                    <ZoomIn className="h-6 w-6 text-white" />
                  </div>
                </div>
              </button>
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
            <div className="border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/30">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  Үйлчлүүлэгчийн үнэлгээ
                </p>
              </div>
              <div className="p-3">
                {/* Rating Stars */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-xl ${
                          star <= request.review!.rating
                            ? "text-amber-500"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {request.review.rating} / 5
                  </span>
                </div>
                {/* Comment */}
                {request.review.comment && (
                  <>
                    <div className="border-t border-amber-200 dark:border-amber-800 my-2" />
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Сэтгэгдэл
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {request.review.comment}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Message - moved below completion report and review */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium mb-1 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Мессеж
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {request.message}
            </p>
          </div>

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
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">
              {isMyRequest ? "Үйлчилгээ үзүүлэгч" : "Захиалагч"}
            </p>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
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
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{getPersonName(otherPerson)}</p>
                {/* Client Phone - только для провайдера */}
                {isProvider && request.client_phone && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowClientPhone(!showClientPhone)}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {showClientPhone ? (
                        <>
                          <span>+976 {request.client_phone.slice(0, 4)}-{request.client_phone.slice(4)}</span>
                          <EyeOff className="h-3.5 w-3.5 ml-1" />
                        </>
                      ) : (
                        <>
                          <span>+976 </span>
                          <span className="blur-sm select-none">{request.client_phone.slice(0, 4)}-{request.client_phone.slice(4)}</span>
                          <Eye className="h-3.5 w-3.5 ml-1" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Call Button - только когда номер раскрыт */}
                {isProvider && request.client_phone && showClientPhone && (
                  <a href={`tel:+976${request.client_phone}`}>
                    <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                      <Phone className="h-4 w-4 mr-1.5" />
                      Залгах
                    </Button>
                  </a>
                )}
                <Link href={`/account/${otherPerson.id}`}>
                  <Button variant="outline" size="sm">
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
            const hasCoordinates = lat && lng;

            // Определяем текст адреса
            const addressText = isRemote
              ? request.listing.address || "Гүйцэтгэгчийн байршил"
              : request.address_detail ||
                [request.aimag?.name, request.district?.name, request.khoroo?.name]
                  .filter(Boolean)
                  .join(", ") ||
                "Захиалагчийн байршил";

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
                  coordinates={[lat, lng]}
                  status={request.status}
                  addressText={addressText}
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
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 h-9 md:h-10 text-sm"
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

          {/* Default close button for other states */}
          {((isMyRequest && !["pending", "awaiting_client_confirmation", "awaiting_completion_details", "awaiting_payment"].includes(request.status)) ||
            (isProvider &&
              ["rejected", "completed", "cancelled_by_client", "cancelled_by_provider", "disputed"].includes(
                request.status
              ))) && (
            <div className="flex gap-2 md:gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-9 md:h-10 text-sm" onClick={onClose}>
                Хаах
              </Button>
              {isMyRequest &&
                ["rejected", "cancelled_by_client", "cancelled_by_provider"].includes(request.status) && (
                  <Button variant="destructive" size="sm" className="h-9 md:h-10 text-sm" onClick={onDeleteRequest}>
                    <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                    Устгах
                  </Button>
                )}
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
