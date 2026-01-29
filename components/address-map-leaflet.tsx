"use client";

import * as React from "react";
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { X } from "lucide-react";
import {
  TILE_URL,
  MapViewController,
  MapControlsContainer,
  ZoomControls,
  CenterButton,
  MyLocationButton,
  CloseButton,
  LegendItem,
  PreviewMapWrapper,
  useGeolocation,
  useAutoHideError,
} from "@/components/maps/shared";

interface AddressMapLeafletProps {
  coordinates: [number, number];
  radius: number;
  className?: string;
  addressText?: string;
}

// Полноэкранная модалка карты для отображения адреса
function AddressFullscreenModal({
  coordinates,
  radius,
  addressText,
  onClose,
}: {
  coordinates: [number, number];
  radius: number;
  addressText?: string;
  onClose: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = React.useRef<any>(null);

  // Zoom уровень зависит от радиуса: чем меньше радиус, тем ближе zoom
  const getInitialZoom = () => {
    if (radius <= 500) return 16;
    if (radius <= 1000) return 15;
    if (radius <= 2000) return 14;
    if (radius <= 5000) return 13;
    return 12;
  };

  const [zoom, setZoom] = React.useState(getInitialZoom());
  const { location: userLocation, isLocating, error, requestLocation, clearError } = useGeolocation();
  const visibleError = useAutoHideError(error);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 1, 18));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 1, 10));

  const handleCenter = () => {
    if (mapRef.current) {
      mapRef.current.setView(coordinates, zoom);
    }
  };

  const handleShowMyLocation = () => {
    requestLocation();
  };

  // Fly to user location and fit bounds when it becomes available
  React.useEffect(() => {
    if (userLocation && mapRef.current) {
      const bounds = [coordinates, userLocation];
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [userLocation, coordinates]);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-9999 flex items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <div
        className="leaflet-map-modal relative w-full h-full md:w-[90vw] md:max-w-3xl md:h-[80vh] shadow-2xl md:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-1001 bg-linear-to-b from-black/60 to-transparent p-4">
          <div className="flex items-start justify-between">
            <div className="text-white">
              <h3 className="font-semibold text-lg">Байршил</h3>
              {addressText && (
                <p className="text-sm text-white/80 mt-0.5">{addressText}</p>
              )}
            </div>
            <CloseButton onClick={onClose} />
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
            <MapViewController center={coordinates} zoom={zoom} />
            <TileLayer url={TILE_URL} maxZoom={19} />
            <Circle
              center={coordinates}
              radius={radius}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.15,
                weight: 3,
              }}
            />
            {/* Центральная точка - адрес услуги */}
            <Circle
              center={coordinates}
              radius={30}
              pathOptions={{
                color: "#ef4444",
                fillColor: "#ef4444",
                fillOpacity: 0.8,
                weight: 2,
              }}
            />
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
          <MapControlsContainer position="top-right" offsetTop>
            <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
            <CenterButton onClick={handleCenter} />
            <MyLocationButton
              onClick={handleShowMyLocation}
              isLocating={isLocating}
              hasLocation={!!userLocation}
            />
          </MapControlsContainer>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-1001 p-4 pb-safe bg-linear-to-t from-black/40 via-black/20 to-transparent">
          {/* Ошибка геолокации */}
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

          {/* Легенда */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <LegendItem color="#ef4444" label="Үйлчилгээний хаяг" />
            {userLocation && (
              <LegendItem color="#22c55e" label="Миний байршил" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AddressMapLeaflet({
  coordinates,
  radius,
  className,
  addressText,
}: AddressMapLeafletProps) {
  const [showFullscreen, setShowFullscreen] = React.useState(false);

  return (
    <>
      {/* Preview карта */}
      <PreviewMapWrapper
        onClick={() => setShowFullscreen(true)}
        className={className}
        height="h-45"
      >
        <MapContainer
          center={coordinates}
          zoom={radius > 2000 ? 12 : 14}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          doubleClickZoom={false}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer url={TILE_URL} maxZoom={19} />
          <Circle
            center={coordinates}
            radius={radius}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.2,
              weight: 2,
            }}
          />
        </MapContainer>
      </PreviewMapWrapper>

      {/* Fullscreen модалка */}
      {showFullscreen && (
        <AddressFullscreenModal
          coordinates={coordinates}
          radius={radius}
          addressText={addressText}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </>
  );
}
