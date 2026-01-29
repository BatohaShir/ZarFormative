"use client";

import * as React from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

// ============================================
// SHARED MAP CONTROLLER COMPONENTS
// Consolidated from 9 map component files
// ============================================

// ============================================
// VIEW CONTROLLER - Sets map view
// ============================================

interface MapViewControllerProps {
  center: [number, number];
  zoom: number;
}

export function MapViewController({ center, zoom }: MapViewControllerProps) {
  const map = useMap();

  React.useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
}

// ============================================
// FLY TO CONTROLLER - Animates to position
// ============================================

interface FlyToControllerProps {
  position: [number, number] | null;
  zoom?: number;
  duration?: number;
  trigger?: number; // Increment to re-trigger fly
}

export function FlyToController({
  position,
  zoom = 14,
  duration = 1,
  trigger = 0,
}: FlyToControllerProps) {
  const map = useMap();

  React.useEffect(() => {
    if (position) {
      map.flyTo(position, zoom, { duration });
    }
  }, [map, position, zoom, duration, trigger]);

  return null;
}

// ============================================
// BOUNDS CONTROLLER - Fits map to coordinates
// ============================================

interface MapBoundsControllerProps {
  coords: [number, number][];
  padding?: [number, number];
  maxZoom?: number;
  singlePointZoom?: number;
}

export function MapBoundsController({
  coords,
  padding = [50, 50],
  maxZoom = 12,
  singlePointZoom = 12,
}: MapBoundsControllerProps) {
  const map = useMap();

  React.useEffect(() => {
    if (coords.length === 0) return;

    if (coords.length === 1) {
      map.setView(coords[0], singlePointZoom);
    } else {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding, maxZoom });
    }
  }, [map, coords, padding, maxZoom, singlePointZoom]);

  return null;
}

// ============================================
// CLICK HANDLER - Handles map clicks
// ============================================

interface MapClickHandlerProps {
  onCoordinatesChange: (coords: [number, number]) => void;
}

export function MapClickHandler({ onCoordinatesChange }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onCoordinatesChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// ============================================
// RESIZE HANDLER - Handles container resize
// ============================================

interface MapResizeHandlerProps {
  trigger: boolean | number; // Any change triggers resize
}

export function MapResizeHandler({ trigger }: MapResizeHandlerProps) {
  const map = useMap();

  React.useEffect(() => {
    // Wait for CSS transition to complete, then invalidate size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 350);

    return () => clearTimeout(timer);
  }, [map, trigger]);

  return null;
}

// ============================================
// GEOLOCATION HOOK - Get user's location
// ============================================

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
}

interface UseGeolocationResult {
  location: [number, number] | null;
  isLocating: boolean;
  error: string | null;
  requestLocation: () => void;
  clearError: () => void;
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationResult {
  const { enableHighAccuracy = true, timeout = 10000 } = options;

  const [location, setLocation] = React.useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const requestLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setError("Таны браузер байршил тодорхойлохыг дэмжихгүй байна");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation([position.coords.latitude, position.coords.longitude]);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Байршил тодорхойлох зөвшөөрөл өгөөгүй байна");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Байршил тодорхойлох боломжгүй байна");
            break;
          case err.TIMEOUT:
            setError("Хугацаа дууслаа, дахин оролдоно уу");
            break;
          default:
            setError("Алдаа гарлаа");
        }
      },
      { enableHighAccuracy, timeout }
    );
  }, [enableHighAccuracy, timeout]);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { location, isLocating, error, requestLocation, clearError };
}

// ============================================
// AUTO-HIDE ERROR HOOK
// ============================================

export function useAutoHideError(error: string | null, delay: number = 5000) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (error) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), delay);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [error, delay]);

  return visible ? error : null;
}
