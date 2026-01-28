"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, X, Loader2, MapPin } from "lucide-react";
import type { ListingWithRelations } from "@/components/listing-card";
// OPTIMIZATION: Импортируем функцию для вычисления координат
import { getListingsWithCoords, type ListingWithCoords } from "./services-map-leaflet";

interface ServicesMapProps {
  listings: ListingWithRelations[];
  className?: string;
  onLocationSelect?: (districtId: string | null, aimagId: string | null) => void;
}

// Динамический импорт Leaflet компонента (без SSR)
const ServicesMapLeaflet = dynamic(
  () => import("./services-map-leaflet").then((mod) => mod.ServicesMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted/50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// Re-export для использования в других компонентах
export { getListingsWithCoords, type ListingWithCoords };

export function ServicesMap({ listings, className, onLocationSelect }: ServicesMapProps) {
  const [isMapActive, setIsMapActive] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Handle location selection from map - filter by location but keep map active
  const handleLocationSelect = React.useCallback((districtId: string | null, aimagId: string | null) => {
    // Close fullscreen mode but keep map active
    setIsFullscreen(false);
    // Don't close the map - just filter results
    onLocationSelect?.(districtId, aimagId);
  }, [onLocationSelect]);

  // OPTIMIZATION: Используем общую функцию для вычисления координат
  // Результат передаётся в Leaflet компонент, избегая дублирования вычислений
  const listingsWithCoords = React.useMemo(() => {
    return getListingsWithCoords(listings);
  }, [listings]);

  return (
    <>
      {/* Blurred preview / Active map */}
      <div className={`relative overflow-hidden rounded-xl border bg-muted ${className}`}>
        {!isMapActive ? (
          // Frosted glass preview state with static map background
          <div className="relative w-full h-full min-h-50 md:min-h-75">
            {/* Static map background - Mongolia centered (no external request) */}
            <div className="absolute inset-0 rounded-xl overflow-hidden bg-linear-to-br from-blue-100 via-green-50 to-yellow-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-600" />
            {/* Frosted glass overlay */}
            <div className="absolute inset-0 backdrop-blur-sm bg-white/20 dark:bg-black/30" />

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
              <div className="flex items-center gap-2 text-gray-700 dark:text-white/90 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                <span>{listings.length} үйлчилгээ</span>
              </div>
              <Button
                onClick={() => setIsMapActive(true)}
                className="gap-2 bg-white text-black hover:bg-white/90 shadow-lg border border-gray-200"
              >
                <MapIcon className="h-4 w-4" />
                Map дээр үзэх
              </Button>
            </div>
          </div>
        ) : (
          // Active map state
          <div className="relative w-full h-full min-h-50 md:min-h-75">
            <ServicesMapLeaflet
              listings={listings}
              listingsWithCoords={listingsWithCoords}
              onFullscreen={() => setIsFullscreen(true)}
              onLocationSelect={handleLocationSelect}
            />
            {/* Close button */}
            <button
              onClick={() => setIsMapActive(false)}
              className="absolute top-3 right-3 z-500 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen map modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-0 md:p-6"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="relative w-full h-full md:w-[95vw] md:max-w-6xl md:h-[90vh] shadow-2xl md:rounded-2xl overflow-hidden bg-[#1a1a2e]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-[1001] bg-gradient-to-b from-black/60 to-transparent p-4 md:rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div className="text-white">
                  <h3 className="font-semibold text-lg">Газрын зураг</h3>
                  <p className="text-sm text-white/70">{listings.length} үйлчилгээ</p>
                </div>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Map */}
            <div className="absolute inset-0">
              <ServicesMapLeaflet
                listings={listings}
                listingsWithCoords={listingsWithCoords}
                isFullscreen
                onLocationSelect={handleLocationSelect}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
