"use client";

import * as React from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  TILE_URL,
  TILE_ATTRIBUTION,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from "@/components/map-constants";

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
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      {children}
    </MapContainer>
  );
}

// Hook для получения tile URL (теперь всегда один URL, тема через CSS)
export function useMapTileUrl(): string {
  return TILE_URL;
}
