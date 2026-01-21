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
} from "lucide-react";
import type { RequestWithRelations, RequestActions } from "./types";
import { getStatusBadge, getPersonName, getListingImage, formatCreatedAt } from "./utils";

// Lazy load AddressMap - heavy component with Leaflet
const AddressMap = dynamic(
  () => import("@/components/address-map").then((mod) => ({ default: mod.AddressMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 bg-muted animate-pulse rounded-lg flex items-center justify-center">
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
}

export const RequestDetailModal = React.memo(function RequestDetailModal({
  request,
  userId,
  actions,
  onClose,
  onDeleteRequest,
}: RequestDetailModalProps) {
  const isMyRequest = request.client_id === userId;
  const isProvider = request.provider_id === userId;
  const otherPerson = isMyRequest ? request.provider : request.client;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <div className="bg-background w-full md:max-w-2xl md:rounded-xl rounded-t-xl max-h-[90vh] overflow-auto">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Хүсэлтийн дэлгэрэнгүй</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4">
          {/* Service Info */}
          <div className="flex gap-4">
            <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
              <Image
                src={getListingImage(request.listing)}
                alt={request.listing.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/services/${request.listing.slug}`}
                  className="font-semibold text-lg hover:underline"
                >
                  {request.listing.title}
                </Link>
              </div>
              <div className="mt-2">
                {getStatusBadge(request.status, isMyRequest ? "sent" : "received")}
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium mb-1 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Мессеж
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {request.message}
            </p>
          </div>

          {/* Client Image - показываем только для incoming заявок (исполнитель смотрит) */}
          {request.image_url && isProvider && (
            <div className="border rounded-lg overflow-hidden">
              <p className="text-sm font-medium p-3 border-b bg-muted/30 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Зураг
              </p>
              <div className="relative w-full aspect-video">
                <Image
                  src={request.image_url}
                  alt="Хүсэлтийн зураг"
                  fill
                  className="object-cover"
                />
              </div>
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
              <div className="flex-1">
                <p className="font-semibold">{getPersonName(otherPerson)}</p>
              </div>
              <Link href={`/account/${otherPerson.id}`}>
                <Button variant="outline" size="sm">
                  Профайл
                </Button>
              </Link>
            </div>
          </div>

          {/* Address Info - only show for incoming requests (I'm provider) */}
          {isProvider && request.aimag && (
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Үйлчилгээ үзүүлэх хаяг
                </p>
                <p className="text-sm font-medium">
                  {[request.aimag?.name, request.district?.name, request.khoroo?.name]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {request.address_detail && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {request.address_detail}
                  </p>
                )}
              </div>
              {/* Map with circle marker */}
              <AddressMap
                aimagName={request.aimag?.name}
                districtName={request.district?.name}
                khorooName={request.khoroo?.name}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-background border-t p-4">
          {/* Actions for INCOMING pending requests (я provider) */}
          {isProvider && request.status === "pending" && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => actions.onReject(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Татгалзах
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => actions.onAccept(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Хүлээн авах
              </Button>
            </div>
          )}

          {/* Actions for ACCEPTED requests (provider can start work or cancel) */}
          {isProvider && request.status === "accepted" && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => actions.onCancelByProvider(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Цуцлах
              </Button>
              <Button
                className="flex-1"
                onClick={() => actions.onStartWork(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Ажил эхлүүлэх
              </Button>
            </div>
          )}

          {/* Actions for IN_PROGRESS requests (provider can complete) */}
          {isProvider && request.status === "in_progress" && (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Хаах
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => actions.onComplete(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Дуусгах
              </Button>
            </div>
          )}

          {/* Actions for MY pending requests (я client - могу отменить) */}
          {isMyRequest && request.status === "pending" && (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Хаах
              </Button>
              <Button
                variant="destructive"
                onClick={() => actions.onCancelByClient(request.id)}
                disabled={actions.isUpdating}
              >
                {actions.isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Цуцлах
              </Button>
            </div>
          )}

          {/* Default close button for other states */}
          {((isMyRequest && !["pending"].includes(request.status)) ||
            (isProvider &&
              ["rejected", "completed", "cancelled_by_client", "cancelled_by_provider", "disputed"].includes(
                request.status
              ))) && (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Хаах
              </Button>
              {isMyRequest &&
                ["rejected", "cancelled_by_client", "cancelled_by_provider"].includes(request.status) && (
                  <Button variant="destructive" onClick={onDeleteRequest}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Устгах
                  </Button>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
