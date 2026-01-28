"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Динамический импорт карты (без SSR)
const MapComponent = dynamic(
  () => import("./live-tracking-map-leaflet").then((mod) => mod.LiveTrackingMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-75 rounded-lg bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface LiveTrackingMapProps {
  requestId: string;
  clientId: string;
  providerId: string;
  clientName: string;
  providerName: string;
  serviceLocation?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  className?: string;
  isActiveJob?: boolean;
}

export function LiveTrackingMap({
  requestId,
  clientId,
  providerId,
  clientName,
  providerName,
  serviceLocation,
  className,
  isActiveJob = false,
}: LiveTrackingMapProps) {
  return (
    <MapComponent
      requestId={requestId}
      clientId={clientId}
      providerId={providerId}
      clientName={clientName}
      providerName={providerName}
      serviceLocation={serviceLocation}
      className={className}
      isActiveJob={isActiveJob}
    />
  );
}
