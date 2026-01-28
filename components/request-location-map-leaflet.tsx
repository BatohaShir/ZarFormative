"use client";

import * as React from "react";
import { MapContainer, TileLayer, Circle, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { X, ZoomIn, ZoomOut, Navigation2, Maximize2, MapPin, Loader2 } from "lucide-react";
import { TILE_URL } from "@/components/ui/base-map";

interface RequestLocationMapLeafletProps {
  coordinates: [number, number];
  radius: number; // 0 = показать точку, >0 = показать круг
  showExactMarker: boolean;
  className?: string;
  addressText?: string;
}

// Создаём кастомную иконку маркера (ленивая загрузка)
const createMarkerIcon = () => {
  // Импортируем L только на клиенте
  const L = require("leaflet");
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

// Компонент для управления картой
function MapController({
  coordinates,
  zoom
}: {
  coordinates: [number, number];
  zoom: number;
}) {
  const map = useMap();

  React.useEffect(() => {
    map.setView(coordinates, zoom);
  }, [map, coordinates, zoom]);

  return null;
}

// Полноэкранная модалка карты
function FullscreenMapModal({
  coordinates,
  radius,
  showExactMarker,
  addressText,
  onClose,
}: {
  coordinates: [number, number];
  radius: number;
  showExactMarker: boolean;
  addressText?: string;
  onClose: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = React.useRef<any>(null);
  const markerIcon = React.useMemo(() => createMarkerIcon(), []);

  const getInitialZoom = () => {
    if (showExactMarker) return 16;
    if (radius <= 500) return 15;
    if (radius <= 1000) return 14;
    return 13;
  };

  const [zoom, setZoom] = React.useState(getInitialZoom());
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string | null>(null);

  // Автоматически скрываем ошибку через 5 секунд
  React.useEffect(() => {
    if (locationError) {
      const timer = setTimeout(() => setLocationError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [locationError]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 1, 18));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 1, 10));
  const handleCenter = () => {
    if (mapRef.current) {
      mapRef.current.setView(coordinates, zoom);
    }
  };

  const handleShowMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Таны браузер байршил тодорхойлохыг дэмжихгүй байна");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setIsLocating(false);

        // Фокусируемся на моём местоположении
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 16, { duration: 1 });
        }
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Байршил тодорхойлох зөвшөөрөл өгөөгүй байна");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Байршил тодорхойлох боломжгүй байна");
            break;
          case error.TIMEOUT:
            setLocationError("Хугацаа дууслаа, дахин оролдоно уу");
            break;
          default:
            setLocationError("Алдаа гарлаа");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <div
        className="leaflet-map-modal relative w-full h-full md:w-[90vw] md:max-w-3xl md:h-[80vh] shadow-2xl md:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with stronger gradient for text visibility */}
        <div className="absolute top-0 left-0 right-0 z-[1001] bg-linear-to-b from-black/70 via-black/40 to-transparent p-4 pb-8">
          <div className="flex items-start justify-between">
            <div className="text-white drop-shadow-lg">
              <h3 className="font-semibold text-lg drop-shadow-md">Байршил</h3>
              {addressText && (
                <p className="text-sm text-white/90 mt-0.5 drop-shadow-md">{addressText}</p>
              )}
              {!showExactMarker && (
                <p className="text-xs text-amber-300 mt-1">
                  Хүсэлт хүлээн авагдсаны дараа яг байршил харагдана
                </p>
              )}
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
            center={coordinates}
            zoom={zoom}
            scrollWheelZoom={true}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
            attributionControl={false}
            ref={mapRef}
          >
            <MapController coordinates={coordinates} zoom={zoom} />
            <TileLayer url={TILE_URL} maxZoom={19} />

            {/* Если показываем точную локацию - маркер */}
            {showExactMarker ? (
              <Marker position={coordinates} icon={markerIcon} />
            ) : (
              /* Если pending - показываем круг 500м */
              <Circle
                center={coordinates}
                radius={radius}
                pathOptions={{
                  color: "#f59e0b",
                  fillColor: "#f59e0b",
                  fillOpacity: 0.2,
                  weight: 3,
                  dashArray: "10, 10",
                }}
              />
            )}

            {/* Моё местоположение */}
            {userLocation && (
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
            {/* Фокус на заявке */}
            <button
              type="button"
              onClick={handleCenter}
              className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
              title="Байршилд төвлөрөх"
            >
              <MapPin className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            {/* Моё местоположение */}
            <button
              type="button"
              onClick={handleShowMyLocation}
              disabled={isLocating}
              className={cn(
                "w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors border",
                userLocation
                  ? "bg-green-500 hover:bg-green-600 border-green-600"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600",
                isLocating && "opacity-70 cursor-wait"
              )}
              title="Миний байршил"
            >
              {isLocating ? (
                <Loader2 className={cn("h-5 w-5 animate-spin", userLocation ? "text-white" : "text-gray-700 dark:text-gray-300")} />
              ) : (
                <Navigation2 className={cn("h-5 w-5 rotate-45", userLocation ? "text-white" : "text-gray-700 dark:text-gray-300")} />
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-[1001] p-4 pb-safe bg-gradient-to-t from-black/40 via-black/20 to-transparent">
          {locationError && (
            <button
              type="button"
              onClick={() => setLocationError(null)}
              className="mb-3 text-xs text-white bg-red-500/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 hover:bg-red-600/90 transition-colors"
            >
              <span>{locationError}</span>
              <X className="h-3.5 w-3.5 shrink-0" />
            </button>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-100 dark:border-gray-700">
              {showExactMarker ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Яг байршил</span>
                </>
              ) : (
                <>
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50 border-2 border-dashed border-amber-600" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Ойролцоо байршил (~500м)</span>
                </>
              )}
            </div>
            {userLocation && (
              <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-100 dark:border-gray-700">
                <span className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Миний байршил</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RequestLocationMapLeaflet({
  coordinates,
  radius,
  showExactMarker,
  className,
  addressText,
}: RequestLocationMapLeafletProps) {
  const [showFullscreen, setShowFullscreen] = React.useState(false);
  const markerIcon = React.useMemo(() => createMarkerIcon(), []);

  // Проверка валидности координат
  if (!coordinates || coordinates[0] == null || coordinates[1] == null) {
    return (
      <div className={cn(
        "w-full h-50 rounded-xl overflow-hidden relative z-0 bg-muted flex items-center justify-center",
        className
      )}>
        <span className="text-sm text-muted-foreground">Байршил олдсонгүй</span>
      </div>
    );
  }

  return (
    <>
      {/* Preview карта */}
      <button
        type="button"
        onClick={() => setShowFullscreen(true)}
        className={cn(
          "w-full h-[200px] rounded-xl overflow-hidden relative z-0 group cursor-pointer",
          "ring-1 ring-border hover:ring-primary/50 transition-all",
          className
        )}
      >
        <MapContainer
          center={coordinates}
          zoom={showExactMarker ? 15 : 14}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          doubleClickZoom={false}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer url={TILE_URL} maxZoom={19} />

          {showExactMarker ? (
            <Marker position={coordinates} icon={markerIcon} />
          ) : (
            <Circle
              center={coordinates}
              radius={radius}
              pathOptions={{
                color: "#f59e0b",
                fillColor: "#f59e0b",
                fillOpacity: 0.2,
                weight: 2,
                dashArray: "8, 8",
              }}
            />
          )}
        </MapContainer>

        {/* Gradient overlay for better badge visibility */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-linear-to-b from-black/40 to-transparent z-10 pointer-events-none rounded-t-xl" />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center z-20">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
            <Maximize2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </div>
        </div>

        {/* Status badge */}
        <div className="absolute top-2 left-2 z-30">
          {showExactMarker ? (
            <span className="text-[10px] bg-green-500 text-white px-2 py-1 rounded-full font-medium">
              Яг байршил
            </span>
          ) : (
            <span className="text-[10px] bg-amber-500 text-white px-2 py-1 rounded-full font-medium">
              ~500м радиус
            </span>
          )}
        </div>

        {/* Click hint */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] bg-black/50 text-white px-2 py-1 rounded-full">
            Дарж томруулах
          </span>
        </div>
      </button>

      {/* Fullscreen модалка */}
      {showFullscreen && (
        <FullscreenMapModal
          coordinates={coordinates}
          radius={radius}
          showExactMarker={showExactMarker}
          addressText={addressText}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </>
  );
}
