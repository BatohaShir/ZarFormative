"use client";

import * as React from "react";
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import { TILE_URL } from "@/components/ui/base-map";
import { cn } from "@/lib/utils";
import {
  MapControlsContainer,
  ZoomControls,
  MyLocationButton,
  CenterButton,
  CloseButton,
} from "./map-controls";
import { MapViewController, useGeolocation, useAutoHideError } from "./map-controllers";
import { X } from "lucide-react";

// ============================================
// FULLSCREEN MAP MODAL WRAPPER
// Consolidated from 9 map component files
// ============================================

interface FullscreenMapModalProps {
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  warning?: string;
  // Map configuration
  center: [number, number];
  initialZoom?: number;
  // Features
  showMyLocation?: boolean;
  showCenterButton?: boolean;
  // Footer content
  footer?: React.ReactNode;
  // Legend items
  legend?: React.ReactNode;
}

export function FullscreenMapModal({
  onClose,
  children,
  title = "Байршил",
  subtitle,
  warning,
  center,
  initialZoom = 14,
  showMyLocation = true,
  showCenterButton = true,
  footer,
  legend,
}: FullscreenMapModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = React.useRef<any>(null);
  const [zoom, setZoom] = React.useState(initialZoom);
  const { location: userLocation, isLocating, error, requestLocation, clearError } = useGeolocation();
  const visibleError = useAutoHideError(error);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 1, 18));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 1, 10));

  const handleCenter = () => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  };

  const handleMyLocation = () => {
    requestLocation();
    // Fly to user location when available
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation, 16, { duration: 1 });
    }
  };

  // Fly to user location when it becomes available
  React.useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation, 16, { duration: 1 });
    }
  }, [userLocation]);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <div
        className="leaflet-map-modal relative w-full h-full md:w-[90vw] md:max-w-3xl md:h-[80vh] shadow-2xl md:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-[1001] bg-gradient-to-b from-black/70 via-black/40 to-transparent p-4 pb-8">
          <div className="flex items-start justify-between">
            <div className="text-white drop-shadow-lg">
              <h3 className="font-semibold text-lg drop-shadow-md">{title}</h3>
              {subtitle && (
                <p className="text-sm text-white/90 mt-0.5 drop-shadow-md">{subtitle}</p>
              )}
              {warning && (
                <p className="text-xs text-amber-300 mt-1">{warning}</p>
              )}
            </div>
            <CloseButton onClick={onClose} />
          </div>
        </div>

        {/* Map */}
        <div className="absolute inset-0 md:rounded-2xl overflow-hidden">
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={true}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
            attributionControl={false}
            ref={mapRef}
          >
            <MapViewController center={center} zoom={zoom} />
            <TileLayer url={TILE_URL} maxZoom={19} />

            {/* Custom map content */}
            {children}

            {/* User location marker */}
            {showMyLocation && userLocation && (
              <Circle
                center={userLocation}
                radius={25}
                pathOptions={{
                  color: "#22c55e",
                  fillColor: "#22c55e",
                  fillOpacity: 0.9,
                  weight: 3,
                }}
              />
            )}
          </MapContainer>

          {/* Controls */}
          <MapControlsContainer position="top-right" offsetTop>
            <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
            {showCenterButton && <CenterButton onClick={handleCenter} />}
            {showMyLocation && (
              <MyLocationButton
                onClick={handleMyLocation}
                isLocating={isLocating}
                hasLocation={!!userLocation}
              />
            )}
          </MapControlsContainer>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-[1001] p-4 pb-safe bg-gradient-to-t from-black/40 via-black/20 to-transparent">
          {/* Error message */}
          {visibleError && (
            <button
              type="button"
              onClick={clearError}
              className="mb-3 text-xs text-white bg-red-500/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 hover:bg-red-600/90 transition-colors"
            >
              <span>{visibleError}</span>
              <X className="h-3.5 w-3.5 shrink-0" />
            </button>
          )}

          {/* Legend */}
          {legend && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {legend}
            </div>
          )}

          {/* Custom footer content */}
          {footer}
        </div>
      </div>
    </div>
  );
}

// ============================================
// LEGEND ITEM COMPONENT
// ============================================

interface LegendItemProps {
  color: string;
  label: string;
  dashed?: boolean;
}

export function LegendItem({ color, label, dashed }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-100 dark:border-gray-700">
      <span
        className={cn(
          "w-3.5 h-3.5 rounded-full shadow-sm",
          dashed && "border-2 border-dashed"
        )}
        style={{
          backgroundColor: color,
          boxShadow: `0 1px 2px ${color}80`,
          borderColor: dashed ? color : undefined,
        }}
      />
      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
        {label}
      </span>
    </div>
  );
}

// ============================================
// PREVIEW MAP WRAPPER (clickable to fullscreen)
// ============================================

interface PreviewMapWrapperProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  height?: string;
  badge?: React.ReactNode;
}

export function PreviewMapWrapper({
  onClick,
  children,
  className,
  height = "h-[180px]",
  badge,
}: PreviewMapWrapperProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl overflow-hidden relative z-0 group cursor-pointer",
        "ring-1 ring-border hover:ring-primary/50 transition-all",
        height,
        className
      )}
    >
      {children}

      {/* Gradient overlay for better badge visibility */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none rounded-t-xl" />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center z-20">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
          <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </div>
      </div>

      {/* Badge */}
      {badge && (
        <div className="absolute top-2 left-2 z-30">
          {badge}
        </div>
      )}

      {/* Click hint */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
        <span className="text-[10px] bg-black/50 text-white px-2 py-1 rounded-full">
          Дарж томруулах
        </span>
      </div>
    </button>
  );
}
