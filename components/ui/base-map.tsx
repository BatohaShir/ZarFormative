"use client";

import * as React from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// OpenStreetMap - полная детализация (адреса, организации, POI)
// Тёмная тема реализована через CSS фильтр в globals.css
export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// Legacy export для обратной совместимости
export const TILE_URLS = {
  light: TILE_URL,
  dark: TILE_URL, // CSS инверсия в globals.css
} as const;

const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Default Mongolia center (Ulaanbaatar)
export const DEFAULT_MAP_CENTER: [number, number] = [47.9184, 106.9177];
export const DEFAULT_MAP_ZOOM = 14;

export interface BaseMapProps {
  center?: [number, number];
  zoom?: number;
  scrollWheelZoom?: boolean;
  zoomControl?: boolean;
  dragging?: boolean;
  doubleClickZoom?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  mapRef?: React.RefObject<L.Map | null>;
}

export function BaseMap({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  scrollWheelZoom = true,
  zoomControl = false,
  dragging = true,
  doubleClickZoom = true,
  className,
  style,
  children,
  mapRef,
}: BaseMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={scrollWheelZoom}
      zoomControl={zoomControl}
      dragging={dragging}
      doubleClickZoom={doubleClickZoom}
      style={{ height: "100%", width: "100%", ...style }}
      className={className}
      attributionControl={false}
      ref={mapRef}
    >
      <TileLayer
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        maxZoom={19}
      />
      {children}
    </MapContainer>
  );
}

// Hook для получения tile URL (теперь всегда один URL, тема через CSS)
export function useMapTileUrl(): string {
  return TILE_URL;
}

export { TILE_ATTRIBUTION };
