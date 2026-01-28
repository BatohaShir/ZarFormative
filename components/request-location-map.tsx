"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Динамический импорт карты (без SSR)
const MapComponent = dynamic(
  () => import("./request-location-map-leaflet").then((mod) => mod.RequestLocationMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[200px] bg-muted/50 rounded-lg animate-pulse flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface RequestLocationMapProps {
  // Координаты локации (могут быть null)
  coordinates: [number | null, number | null] | null;
  // Статус заявки - определяет показывать ли точную точку или радиус
  status: string;
  // Текст адреса для отображения
  addressText?: string;
  className?: string;
}

export function RequestLocationMap({
  coordinates,
  status,
  addressText,
  className,
}: RequestLocationMapProps) {
  // Проверка валидности координат
  if (!coordinates || coordinates[0] == null || coordinates[1] == null) {
    return (
      <div className="w-full h-50 bg-muted/50 rounded-lg flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Байршил олдсонгүй</span>
      </div>
    );
  }

  // Определяем показывать ли точную точку
  // Точная точка только для accepted, in_progress и дальше
  const showExactLocation = ["accepted", "in_progress", "awaiting_client_confirmation", "awaiting_completion_details", "awaiting_payment", "completed"].includes(status);

  // Радиус - 500м для pending, 0 для точной локации
  const radius = showExactLocation ? 0 : 500;

  return (
    <MapComponent
      coordinates={coordinates as [number, number]}
      radius={radius}
      showExactMarker={showExactLocation}
      className={className}
      addressText={addressText}
    />
  );
}
