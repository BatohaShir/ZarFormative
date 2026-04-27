"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
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
import {
  getStatusBadge,
  getPersonName,
  getListingImage,
  formatCreatedAt,
  isChatAvailable,
} from "./utils";
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
  () =>
    import("@/components/request-location-map").then((mod) => ({
      default: mod.RequestLocationMap,
    })),
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
  () =>
    import("@/components/elapsed-time-counter").then((mod) => ({
      default: mod.ElapsedTimeCounter,
    })),
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

  // Auto-open the completion form / QR payment exactly ONCE per
  // mount, on the first render. The previous effect-based version
  // re-fired any time `showProviderForm` flipped back to false (e.g.
  // after the provider submitted the report and the form closed) —
  // that triggered the form to pop right back open while the parent
  // hadn't yet cleared `shouldOpenCompletionForm`. A ref-guarded
  // one-shot avoids the loop without needing the parent's state to
  // be flipped before the next render.
  const autoOpenedCompletionRef = React.useRef(false);
  React.useEffect(() => {
    if (autoOpenCompletionForm && !autoOpenedCompletionRef.current) {
      autoOpenedCompletionRef.current = true;
      setShowProviderForm(true);
      onCompletionFormOpened?.();
    }
  }, [autoOpenCompletionForm, onCompletionFormOpened]);

  const autoOpenedQRRef = React.useRef(false);
  React.useEffect(() => {
    if (autoOpenQRPayment && !autoOpenedQRRef.current) {
      autoOpenedQRRef.current = true;
      setShowQRPayment(true);
      onQRPaymentOpened?.();
    }
  }, [autoOpenQRPayment, onQRPaymentOpened]);

  // Auto-open chat if requested (from notification). One-shot so
  // closing the chat doesn't immediately re-open it while the
  // parent hasn't cleared the `shouldOpenChat` flag yet.
  const autoOpenedChatRef = React.useRef(false);
  React.useEffect(() => {
    if (autoOpenChat && !autoOpenedChatRef.current) {
      const chatStatus = isChatAvailable(
        request.status,
        request.preferred_date,
        request.preferred_time
      );
      if (chatStatus.available) {
        autoOpenedChatRef.current = true;
        setShowChat(true);
        onChatOpened?.();
      }
    }
  }, [autoOpenChat, request.status, request.preferred_date, request.preferred_time, onChatOpened]);
  const isMyRequest = request.client_id === userId;
  const isProvider = request.provider_id === userId;
  const otherPerson = isMyRequest ? request.provider : request.client;

  // Check if chat is available
  const chatStatus = isChatAvailable(
    request.status,
    request.preferred_date,
    request.preferred_time
  );

  // Handle backdrop click - only close if clicking directly on backdrop
  const handleBackdropClick = React.useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking the backdrop itself, not its children
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-x-0 top-0 bottom-21.5 md:bottom-0 md:inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-stretch md:items-center justify-center md:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-background w-full h-full md:h-auto md:max-w-2xl md:rounded-2xl md:ring-1 md:ring-border md:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="shrink-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-b border-border px-4 py-3 md:px-5 md:py-4 flex items-center justify-between">
          <h3 className="font-display font-bold tracking-tight text-base md:text-lg">
            Хүсэлтийн дэлгэрэнгүй
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="h-9 w-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center active:scale-[0.95]"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {/* Service Info */}
          <div className="flex gap-3 md:gap-4">
            <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-2xl overflow-hidden shrink-0 bg-muted ring-1 ring-border">
              <Image
                src={getListingImage(request.listing)}
                alt={request.listing.title}
                fill
                sizes="(max-width: 768px) 64px, 96px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/services/${request.listing.slug}`}
                className="font-display font-semibold text-sm md:text-lg leading-snug tracking-tight hover:underline line-clamp-2"
              >
                {request.listing.title}
              </Link>
              {/* Price display */}
              <div className="mt-1.5">
                {request.proposed_price ? (
                  <span className="font-display text-base md:text-lg font-bold tabular text-violet-600 dark:text-violet-400">
                    {Number(request.proposed_price).toLocaleString()}₮
                  </span>
                ) : isNegotiable ? (
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Тохиролцоно
                  </span>
                ) : request.listing.price ? (
                  <span className="font-display text-base md:text-lg font-bold tabular text-foreground">
                    {Number(request.listing.price).toLocaleString()}₮
                  </span>
                ) : null}
              </div>
              <div className="mt-2">
                {getStatusBadge(request.status, isMyRequest ? "sent" : "received")}
              </div>
            </div>
          </div>

          {/* Chat Banner - editorial pill */}
          {(request.status === "pending" ||
            request.status === "price_proposed" ||
            request.status === "accepted" ||
            request.status === "in_progress" ||
            request.status === "awaiting_client_confirmation" ||
            request.status === "awaiting_completion_details" ||
            request.status === "awaiting_payment" ||
            request.status === "completed") && (
            <div className="bg-card rounded-2xl ring-1 ring-border p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-foreground text-background flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-sm md:text-base leading-snug">
                      Чат
                    </p>
                    {chatStatus.available ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        Мессеж бичих боломжтой
                      </p>
                    ) : chatStatus.message ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        {chatStatus.message}
                      </p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChat(true)}
                  disabled={!chatStatus.available}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 md:h-10 px-4 md:px-5 rounded-full bg-foreground text-background text-xs md:text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Чат нээх</span>
                  <span className="sm:hidden">Нээх</span>
                </button>
              </div>
            </div>
          )}

          {/* Client Request Details - фото и сообщение */}
          {(request.image_url || request.message) && (
            <div className="rounded-2xl overflow-hidden ring-1 ring-border bg-card">
              <div className="px-4 py-3 border-b border-border bg-muted/40">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Захиалагчийн хүсэлт
                </p>
              </div>

              {request.image_url && (
                <button
                  type="button"
                  onClick={() => setShowImagePreview(true)}
                  className="relative w-full aspect-video group cursor-zoom-in bg-muted"
                >
                  <Image
                    src={request.image_url}
                    alt="Хүсэлтийн зураг"
                    fill
                    sizes="(max-width: 768px) 100vw, 672px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <div className="bg-card rounded-full p-3 shadow-xl ring-1 ring-border transform scale-90 group-hover:scale-100 transition-transform duration-200">
                      <ZoomIn className="h-5 w-5 text-foreground" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <ImageIcon className="h-3 w-3 text-white" />
                      <span className="text-xs text-white font-medium">Зураг</span>
                    </div>
                  </div>
                </button>
              )}

              {request.message && (
                <div className={`p-4 ${request.image_url ? "border-t border-border" : ""}`}>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {request.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Provider Response */}
          {request.provider_response && (
            <div className="bg-blue-500/5 ring-1 ring-blue-500/20 rounded-2xl p-4">
              <p className="text-[10px] md:text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1.5">
                Хариу
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {request.provider_response}
              </p>
            </div>
          )}

          {/* Work Completion Report */}
          {request.completion_description && (
            <div className="rounded-2xl overflow-hidden ring-1 ring-emerald-500/20 bg-emerald-500/5">
              <div className="px-4 py-3 border-b border-emerald-500/15 bg-emerald-500/10">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Ажлын тайлан
                </p>
              </div>
              <div className="p-4">
                {request.completion_photos && request.completion_photos.length > 0 && (
                  <>
                    <p className="text-[10px] md:text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Зураг ({request.completion_photos.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {request.completion_photos.map((photoUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setShowCompletionPhoto(photoUrl)}
                          className="relative aspect-square rounded-xl overflow-hidden group cursor-zoom-in ring-1 ring-emerald-500/20 bg-muted"
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
                  </>
                )}
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Тайлбар
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {request.completion_description}
                </p>
              </div>
            </div>
          )}

          {/* Client Review */}
          {request.review && (
            <div className="rounded-2xl overflow-hidden ring-1 ring-border bg-card">
              <div className="px-4 py-3 border-b border-border bg-muted/40">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Үйлчлүүлэгчийн үнэлгээ
                </p>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-0.5 tabular">
                      <span className="font-display text-3xl font-bold tracking-tight text-foreground">
                        {request.review.rating}
                      </span>
                      <span className="text-base text-muted-foreground">/5</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= request.review!.rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted fill-muted"
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] md:text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${
                      request.review.rating >= 4
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20"
                        : request.review.rating >= 3
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20"
                          : "bg-destructive/10 text-destructive ring-destructive/20"
                    }`}
                  >
                    {request.review.rating >= 5
                      ? "Маш сайн"
                      : request.review.rating >= 4
                        ? "Сайн"
                        : request.review.rating >= 3
                          ? "Дунд"
                          : request.review.rating >= 2
                            ? "Муу"
                            : "Маш муу"}
                  </span>
                </div>
                {request.review.comment && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap italic">
                      &ldquo;{request.review.comment}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-2xl ring-1 ring-border p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wide font-medium">Илгээсэн</span>
              </div>
              <p className="text-sm font-medium tabular">{formatCreatedAt(request.created_at)}</p>
            </div>
            {request.accepted_at && (
              <div className="bg-muted/40 rounded-2xl ring-1 ring-border p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[10px] uppercase tracking-wide font-medium">
                    Зөвшөөрсөн
                  </span>
                </div>
                <p className="text-sm font-medium tabular">
                  {formatCreatedAt(request.accepted_at)}
                </p>
              </div>
            )}
            {request.completed_at && (
              <div className="bg-muted/40 rounded-2xl ring-1 ring-border p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[10px] uppercase tracking-wide font-medium">Дууссан</span>
                </div>
                <p className="text-sm font-medium tabular">
                  {formatCreatedAt(request.completed_at)}
                </p>
              </div>
            )}
          </div>

          {/* Person Info */}
          <div className="bg-card rounded-2xl ring-1 ring-border p-4">
            <p className="text-[10px] md:text-xs uppercase tracking-wide font-medium text-muted-foreground mb-3">
              {isMyRequest ? "Үйлчилгээ үзүүлэгч" : "Захиалагч"}
            </p>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-border">
                  {otherPerson.avatar_url ? (
                    <Image
                      src={otherPerson.avatar_url}
                      alt=""
                      fill
                      sizes="56px"
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
                  <p className="font-display font-semibold text-sm md:text-base leading-snug">
                    {getPersonName(otherPerson)}
                  </p>
                  {/* Client Phone - только для провайдера */}
                  {isProvider && request.client_phone && (
                    <button
                      type="button"
                      onClick={() => setShowClientPhone(!showClientPhone)}
                      className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors mt-1 tabular"
                    >
                      <Phone className="h-3 w-3 md:h-3.5 md:w-3.5" />
                      {showClientPhone ? (
                        <>
                          <span>
                            +976 {request.client_phone.slice(0, 4)}-{request.client_phone.slice(4)}
                          </span>
                          <EyeOff className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </>
                      ) : (
                        <>
                          <span>+976 </span>
                          <span className="blur-sm select-none">
                            {request.client_phone.slice(0, 4)}-{request.client_phone.slice(4)}
                          </span>
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
                      className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors mt-1 tabular"
                    >
                      <Phone className="h-3 w-3 md:h-3.5 md:w-3.5" />
                      {showProviderPhone ? (
                        <>
                          <span>
                            +976 {request.listing.phone.slice(0, 4)}-
                            {request.listing.phone.slice(4)}
                          </span>
                          <EyeOff className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </>
                      ) : (
                        <>
                          <span>+976 </span>
                          <span className="blur-sm select-none">
                            {request.listing.phone.slice(0, 4)}-{request.listing.phone.slice(4)}
                          </span>
                          <Eye className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isProvider && request.client_phone && showClientPhone && (
                  <a href={`tel:+976${request.client_phone}`} className="flex-1 md:flex-initial">
                    <button
                      type="button"
                      className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-foreground text-background text-xs font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Залгах
                    </button>
                  </a>
                )}
                {isMyRequest && request.listing.phone && showProviderPhone && (
                  <a href={`tel:+976${request.listing.phone}`} className="flex-1 md:flex-initial">
                    <button
                      type="button"
                      className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-foreground text-background text-xs font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Залгах
                    </button>
                  </a>
                )}
                <Link href={`/account/${otherPerson.id}`} className="flex-1 md:flex-initial">
                  <button
                    type="button"
                    className="w-full md:w-auto inline-flex items-center justify-center h-9 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-xs font-medium active:scale-[0.98] transition-all"
                  >
                    Профайл
                  </button>
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
            const isActiveOnSite =
              !isRemote &&
              [
                "in_progress",
                "awaiting_client_confirmation",
                "awaiting_completion_details",
                "awaiting_payment",
              ].includes(request.status);

            if (!hasCoordinates) {
              return (
                <div className="bg-card rounded-2xl ring-1 ring-border p-4">
                  <p className="text-[10px] md:text-xs uppercase tracking-wide font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                    {isRemote ? "Гүйцэтгэгчийн хаяг" : "Захиалагчийн хаяг"}
                  </p>
                  <p className="text-sm font-medium">{addressText}</p>
                </div>
              );
            }

            // Live tracking карта для активных on_site заявок
            if (isActiveOnSite) {
              return (
                <div className="rounded-2xl ring-1 ring-blue-500/20 bg-blue-500/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-blue-500/15">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Байршлыг бодит цагаар хянах
                        </span>
                      </div>
                      {request.started_at && (
                        <ElapsedTimeCounter startedAt={request.started_at} size="sm" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{addressText}</p>
                  </div>
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

            // Обычная статичная карта
            return (
              <div className="bg-card rounded-2xl ring-1 ring-border p-4 space-y-3">
                <div>
                  <p className="text-[10px] md:text-xs uppercase tracking-wide font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                    {isRemote ? "Гүйцэтгэгчийн байршил" : "Захиалагчийн байршил"}
                  </p>
                  <p className="text-sm font-medium">{addressText}</p>
                </div>
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
        <div className="shrink-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-5 md:py-4 md:pb-4">
          {/* Actions for INCOMING pending requests (я provider) */}
          {isProvider && request.status === "pending" && (
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => actions.onReject(request.id)}
                disabled={actions.isUpdating}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-destructive text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Татгалзах
              </button>
              {isNegotiable ? (
                <button
                  type="button"
                  onClick={() => setShowPriceModal(true)}
                  disabled={actions.isUpdating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Banknote className="h-4 w-4" />
                  Үнэ санал болгох
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => actions.onAccept(request.id)}
                  disabled={actions.isUpdating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {actions.isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Хүлээн авах
                </button>
              )}
            </div>
          )}

          {/* Provider: price_proposed - waiting for client */}
          {isProvider && request.status === "price_proposed" && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-violet-500/5 ring-1 ring-violet-500/20 rounded-xl">
                <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="text-xs md:text-sm text-violet-700 dark:text-violet-300 tabular">
                  Санал болгосон үнэ:{" "}
                  <span className="font-semibold">
                    {Number(request.proposed_price).toLocaleString()}₮
                  </span>{" "}
                  — Хүлээгдэж байна
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
            </div>
          )}

          {/* Actions for ACCEPTED requests (provider) */}
          {isProvider && request.status === "accepted" && (
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => actions.onCancelByProvider(request.id)}
                disabled={actions.isUpdating}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-destructive text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Цуцлах
              </button>
              <button
                type="button"
                onClick={() => actions.onStartWork(request.id)}
                disabled={actions.isUpdating}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Ажил эхлүүлэх</span>
                <span className="sm:hidden">Эхлүүлэх</span>
              </button>
            </div>
          )}

          {/* Actions for IN_PROGRESS (provider) */}
          {isProvider && request.status === "in_progress" && (
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
              <button
                type="button"
                onClick={() => setShowProviderForm(true)}
                disabled={actions.isUpdating}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Дуусгах
              </button>
            </div>
          )}

          {/* AWAITING_COMPLETION_DETAILS: Provider must submit report */}
          {isProvider && request.status === "awaiting_completion_details" && (
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
              <button
                type="button"
                onClick={() => setShowProviderForm(true)}
                disabled={actions.isUpdating}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                Тайлан илгээх
              </button>
            </div>
          )}

          {/* AWAITING_COMPLETION_DETAILS: Client waiting */}
          {isMyRequest && request.status === "awaiting_completion_details" && (
            <div className="flex flex-col gap-2.5">
              <div className="px-3 py-2.5 bg-blue-500/5 ring-1 ring-blue-500/20 rounded-xl">
                <p className="text-xs md:text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  Гүйцэтгэгч ажлын тайлан илгээхийг хүлээж байна...
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
            </div>
          )}

          {/* AWAITING_CLIENT_CONFIRMATION: Client confirms */}
          {isMyRequest && request.status === "awaiting_client_confirmation" && (
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
              <button
                type="button"
                onClick={() => setShowClientReview(true)}
                disabled={actions.isUpdating}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Баталгаажуулах
              </button>
            </div>
          )}

          {/* AWAITING_CLIENT_CONFIRMATION: Provider waiting */}
          {isProvider && request.status === "awaiting_client_confirmation" && (
            <div className="flex flex-col gap-2.5">
              <div className="px-3 py-2.5 bg-amber-500/5 ring-1 ring-amber-500/20 rounded-xl">
                <p className="text-xs md:text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  Захиалагч баталгаажуулахыг хүлээж байна...
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
            </div>
          )}

          {/* AWAITING_PAYMENT: Provider QR */}
          {isProvider && request.status === "awaiting_payment" && (
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
              <button
                type="button"
                onClick={() => setShowQRPayment(true)}
                disabled={actions.isUpdating}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                Төлбөр авах
              </button>
            </div>
          )}

          {/* AWAITING_PAYMENT: Client waiting */}
          {isMyRequest && request.status === "awaiting_payment" && (
            <div className="flex flex-col gap-2.5">
              <div className="px-3 py-2.5 bg-violet-500/5 ring-1 ring-violet-500/20 rounded-xl">
                <p className="text-xs md:text-sm text-violet-700 dark:text-violet-300 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 shrink-0" />
                  Төлбөр төлөхийг хүлээж байна...
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
            </div>
          )}

          {/* MY pending (client) */}
          {isMyRequest && request.status === "pending" && (
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
              <button
                type="button"
                onClick={() => actions.onCancelByClient(request.id)}
                disabled={actions.isUpdating}
                className="inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-5 rounded-full bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Цуцлах
              </button>
            </div>
          )}

          {/* Client: price_proposed */}
          {isMyRequest && request.status === "price_proposed" && request.proposed_price && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-violet-500/5 ring-1 ring-violet-500/20 rounded-xl">
                <Banknote className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="text-xs md:text-sm font-medium text-violet-700 dark:text-violet-300 tabular">
                  Санал болгосон үнэ: {Number(request.proposed_price).toLocaleString()}₮
                </span>
              </div>
              <div className="flex gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => onRejectPrice?.(request.id)}
                  disabled={actions.isUpdating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-destructive text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {actions.isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Татгалзах
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmPrice?.(request.id)}
                  disabled={actions.isUpdating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {actions.isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Зөвшөөрөх
                </button>
              </div>
            </div>
          )}

          {/* Client: accepted - can cancel */}
          {isMyRequest && request.status === "accepted" && (
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
              <button
                type="button"
                onClick={() => actions.onCancelByClient(request.id)}
                disabled={actions.isUpdating}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-destructive text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Цуцлах
              </button>
            </div>
          )}

          {/* Client: in_progress - just close */}
          {isMyRequest && request.status === "in_progress" && (
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
            </div>
          )}

          {/* Default close */}
          {((isMyRequest &&
            ![
              "pending",
              "price_proposed",
              "awaiting_client_confirmation",
              "awaiting_completion_details",
              "awaiting_payment",
              "accepted",
              "in_progress",
            ].includes(request.status)) ||
            (isProvider &&
              [
                "rejected",
                "completed",
                "cancelled_by_client",
                "cancelled_by_provider",
                "disputed",
              ].includes(request.status))) && (
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center h-10 md:h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium active:scale-[0.98] transition-all"
              >
                Хаах
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && <RequestChat request={request} onClose={() => setShowChat(false)} />}

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
