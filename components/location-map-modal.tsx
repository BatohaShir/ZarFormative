"use client";

import * as React from "react";
import { X, Maximize2, Minimize2, Navigation2, LocateFixed } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TILE_URL } from "@/components/ui/base-map";

// Custom marker icon
const createMarkerIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

// User location marker icon
const createUserLocationIcon = () => {
  return L.divIcon({
    className: "user-location-marker",
    html: `<div style="
      width: 20px;
      height: 20px;
      background: #22c55e;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

interface LocationMapModalProps {
  coordinates: [number, number];
  address: string;
  title: string;
  onClose: () => void;
}

// Component to handle map resize
function MapResizeHandler({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();

  React.useEffect(() => {
    // Wait for CSS transition to complete, then invalidate size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 350);

    return () => clearTimeout(timer);
  }, [map, isFullscreen]);

  return null;
}

// Component to fly to a position
function FlyToPosition({ position, trigger }: { position: [number, number] | null; trigger: number }) {
  const map = useMap();

  React.useEffect(() => {
    if (position && trigger > 0) {
      map.flyTo(position, 16, { duration: 1 });
    }
  }, [map, position, trigger]);

  return null;
}

export function LocationMapModal({
  coordinates,
  address,
  title,
  onClose,
}: LocationMapModalProps) {
  const markerIcon = React.useMemo(() => createMarkerIcon(), []);
  const userLocationIcon = React.useMemo(() => createUserLocationIcon(), []);
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [flyToListingTrigger, setFlyToListingTrigger] = React.useState(0);
  const [flyToUserTrigger, setFlyToUserTrigger] = React.useState(0);

  // Get user location
  const handleGetMyLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!navigator.geolocation) {
      alert("Геолокация браузерт дэмжигдэхгүй байна");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setIsLocating(false);
        setFlyToUserTrigger(prev => prev + 1);
      },
      () => {
        alert("Байршил тодорхойлоход алдаа гарлаа");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Toggle fullscreen
  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFullscreen(!isFullscreen);
  };

  // Center on listing location
  const handleCenterOnListing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFlyToListingTrigger(prev => prev + 1);
  };

  // Prevent clicks from propagating to the Link
  const handleModalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className={`bg-background rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
          isFullscreen
            ? "w-[calc(100vw-32px)] h-[calc(100vh-32px)] max-w-none"
            : "w-full max-w-lg"
        }`}
        onClick={handleModalClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{title}</h3>
            <p className="text-sm text-muted-foreground truncate">{address}</p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors shrink-0 ml-3"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map */}
        <div
          className={`relative w-full transition-all duration-300 ${
            isFullscreen ? "h-[calc(100vh-32px-73px)]" : "h-[300px]"
          }`}
        >
          <MapContainer
            center={coordinates}
            zoom={16}
            scrollWheelZoom={true}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
            attributionControl={false}
          >
            {/* OPTIMIZATION: Используем общую константу TILE_URL */}
            <TileLayer url={TILE_URL} maxZoom={19} />
            <Marker position={coordinates} icon={markerIcon} />

            {/* User location marker */}
            {userLocation && (
              <>
                <Marker position={userLocation} icon={userLocationIcon} />
                <Circle
                  center={userLocation}
                  radius={50}
                  pathOptions={{
                    color: "#22c55e",
                    fillColor: "#22c55e",
                    fillOpacity: 0.15,
                    weight: 2,
                  }}
                />
              </>
            )}

            <FlyToPosition position={userLocation} trigger={flyToUserTrigger} />
            <FlyToPosition position={coordinates} trigger={flyToListingTrigger} />
            <MapResizeHandler isFullscreen={isFullscreen} />
          </MapContainer>

          {/* Gradient overlay for better button visibility */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-linear-to-b from-black/30 to-transparent z-999 pointer-events-none" />

          {/* Map overlay buttons */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
            {/* Fullscreen button */}
            <button
              onClick={handleToggleFullscreen}
              className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={isFullscreen ? "Жижигрүүлэх" : "Томруулах"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>

            {/* My location button - зелёная когда активна */}
            <button
              onClick={handleGetMyLocation}
              disabled={isLocating}
              className={`w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition-colors disabled:opacity-50 border ${
                userLocation
                  ? "bg-green-500 hover:bg-green-600 border-green-600"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
              }`}
              title="Миний байршил"
            >
              <Navigation2 className={`w-5 h-5 rotate-45 ${isLocating ? "animate-pulse" : ""} ${userLocation ? "text-white" : "text-gray-700 dark:text-gray-300"}`} />
            </button>

            {/* Center on listing button */}
            <button
              onClick={handleCenterOnListing}
              className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Үйлчилгээний байршил"
            >
              <LocateFixed className="w-5 h-5 text-blue-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
