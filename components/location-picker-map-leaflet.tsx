"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation2, Loader2, ZoomIn, ZoomOut, Maximize2, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { TILE_URL, DEFAULT_MAP_CENTER } from "@/components/ui/base-map";

// Custom marker icon (lazy load)
const createMarkerIcon = () => {
  const L = require("leaflet");
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

interface LocationPickerMapLeafletProps {
  coordinates: [number, number] | null;
  onCoordinatesChange: (coords: [number, number]) => void;
  addressText?: string | null;
}

// Component to handle map clicks
function MapClickHandler({
  onCoordinatesChange,
}: {
  onCoordinatesChange: (coords: [number, number]) => void;
}) {
  useMapEvents({
    click: (e) => {
      onCoordinatesChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Component to fly to coordinates
function FlyToCoordinates({ coordinates, zoom = 18 }: { coordinates: [number, number] | null; zoom?: number }) {
  const map = useMap();

  React.useEffect(() => {
    if (coordinates) {
      map.flyTo(coordinates, zoom, { duration: 0.5 });
    }
  }, [map, coordinates, zoom]);

  return null;
}

// Fullscreen modal for location picker
function FullscreenLocationPickerModal({
  coordinates,
  onCoordinatesChange,
  onClose,
  addressText,
}: {
  coordinates: [number, number] | null;
  onCoordinatesChange: (coords: [number, number]) => void;
  onClose: () => void;
  addressText?: string | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = React.useRef<any>(null);
  const [zoom, setZoom] = React.useState(coordinates ? 18 : 15);
  const [isLocating, setIsLocating] = React.useState(false);
  const markerIcon = React.useMemo(() => createMarkerIcon(), []);

  const center = coordinates || DEFAULT_MAP_CENTER;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 1, 19));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 1, 10));

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onCoordinatesChange([latitude, longitude]);
        setIsLocating(false);
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 18, { duration: 0.5 });
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCenter = () => {
    if (mapRef.current && coordinates) {
      mapRef.current.setView(coordinates, zoom);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <div
        className="leaflet-map-modal relative w-full h-full md:w-[90vw] md:max-w-4xl md:h-[85vh] shadow-2xl md:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-[1001] bg-gradient-to-b from-black/60 to-transparent p-4">
          <div className="flex items-start justify-between">
            <div className="text-white">
              <h3 className="font-semibold text-lg">Байршил сонгох</h3>
              <p className="text-sm text-white/80 mt-0.5">Газрын зурагт дарж байршлаа сонгоно уу</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
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
            <TileLayer url={TILE_URL} maxZoom={19} />
            <MapClickHandler onCoordinatesChange={onCoordinatesChange} />
            <FlyToCoordinates coordinates={coordinates} zoom={zoom} />

            {coordinates && (
              <Marker position={coordinates} icon={markerIcon} />
            )}
          </MapContainer>

          {/* Controls */}
          <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
            >
              <ZoomIn className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
            >
              <ZoomOut className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            {/* Фокус на выбранной точке */}
            {coordinates && (
              <button
                type="button"
                onClick={handleCenter}
                className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                title="Байршилд төвлөрөх"
              >
                <MapPin className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>
            )}
            {/* Моё местоположение - зелёная когда координаты совпадают с моим местоположением */}
            <button
              type="button"
              onClick={handleMyLocation}
              disabled={isLocating}
              className={cn(
                "w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors border",
                coordinates
                  ? "bg-green-500 hover:bg-green-600 border-green-600"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600",
                isLocating && "opacity-70 cursor-wait"
              )}
              title="Миний байршил"
            >
              {isLocating ? (
                <Loader2 className={cn("h-5 w-5 animate-spin", coordinates ? "text-white" : "text-gray-700 dark:text-gray-300")} />
              ) : (
                <Navigation2 className={cn("h-5 w-5 rotate-45", coordinates ? "text-white" : "text-gray-700 dark:text-gray-300")} />
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-0 left-0 right-0 z-[1001] p-4 pb-safe bg-gradient-to-t from-black/40 via-black/20 to-transparent">
          {coordinates ? (
            <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-gray-100 dark:border-gray-700">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 shrink-0" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate flex-1 min-w-0">
                {addressText || "Байршил сонгогдсон"}
              </p>
            </div>
          ) : (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Газрын зурагт дарж байршлаа сонгоно уу
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LocationPickerMapLeaflet({
  coordinates,
  onCoordinatesChange,
  addressText,
}: LocationPickerMapLeafletProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = React.useRef<any>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const [showFullscreen, setShowFullscreen] = React.useState(false);
  const markerIcon = React.useMemo(() => createMarkerIcon(), []);

  const center = coordinates || DEFAULT_MAP_CENTER;

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onCoordinatesChange([latitude, longitude]);
        setIsLocating(false);
        // Фокусируемся на моём местоположении
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 18, { duration: 0.5 });
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  return (
    <>
      <div className="relative w-full h-[250px] rounded-xl overflow-hidden border group" style={{ isolation: "isolate", contain: "layout paint" }}>
        <MapContainer
          center={center}
          zoom={coordinates ? 18 : 15}
          scrollWheelZoom={true}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
          ref={mapRef}
        >
          <TileLayer url={TILE_URL} maxZoom={19} />
          <MapClickHandler onCoordinatesChange={onCoordinatesChange} />
          <FlyToCoordinates coordinates={coordinates} />

          {coordinates && (
            <Marker position={coordinates} icon={markerIcon} />
          )}
        </MapContainer>

        {/* Gradient overlay for better button visibility */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-linear-to-b from-black/30 to-transparent z-300 pointer-events-none rounded-t-xl" />

        {/* Controls */}
        <div className="absolute top-3 right-3 z-400 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setShowFullscreen(true)}
            className="w-9 h-9 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
            title="Томруулах"
          >
            <Maximize2 className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-9 h-9 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
          >
            <ZoomIn className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-9 h-9 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
          >
            <ZoomOut className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </button>
          {/* Моё местоположение - зелёная когда координаты есть */}
          <button
            type="button"
            onClick={handleMyLocation}
            disabled={isLocating}
            className={cn(
              "w-9 h-9 rounded-lg shadow-md flex items-center justify-center transition-colors disabled:opacity-50 border",
              coordinates
                ? "bg-green-500 hover:bg-green-600 border-green-600"
                : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
            )}
            title="Миний байршил"
          >
            {isLocating ? (
              <Loader2 className={cn("h-4 w-4 animate-spin", coordinates ? "text-white" : "text-gray-700 dark:text-gray-300")} />
            ) : (
              <Navigation2 className={cn("h-4 w-4 rotate-45", coordinates ? "text-white" : "text-gray-700 dark:text-gray-300")} />
            )}
          </button>
        </div>

        {/* Instruction overlay */}
        {!coordinates && (
          <div className="absolute bottom-3 left-3 right-3 z-400 pointer-events-none">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-center shadow-md">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Газрын зурагт дарж байршлаа сонгоно уу
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {showFullscreen && (
        <FullscreenLocationPickerModal
          coordinates={coordinates}
          onCoordinatesChange={onCoordinatesChange}
          onClose={() => setShowFullscreen(false)}
          addressText={addressText}
        />
      )}
    </>
  );
}
