"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

// Lazy load map component
const LocationPickerMapLeaflet = dynamic(
  () => import("./location-picker-map-leaflet").then((mod) => ({ default: mod.LocationPickerMapLeaflet })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-50 bg-muted/50 rounded-xl flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface LocationPickerMapProps {
  coordinates: [number, number] | null;
  onCoordinatesChange: (coords: [number, number] | null, address?: string | null) => void;
  className?: string;
}

// ========== GEOCODING CACHE ==========
const GEOCODE_CACHE_KEY = "geocode_cache";
const GEOCODE_CACHE_MAX_SIZE = 100;
const GEOCODE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  address: string | null;
  timestamp: number;
}

interface GeocodeCache {
  [key: string]: CacheEntry;
}

function getCacheKey(lat: number, lng: number): string {
  // Round to 5 decimal places (~1m precision) for cache key
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function getCache(): GeocodeCache {
  if (typeof window === "undefined") return {};
  try {
    const cached = localStorage.getItem(GEOCODE_CACHE_KEY);
    if (!cached) return {};
    return JSON.parse(cached) as GeocodeCache;
  } catch {
    return {};
  }
}

function setCache(cache: GeocodeCache): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

function getCachedAddress(lat: number, lng: number): string | null | undefined {
  const cache = getCache();
  const key = getCacheKey(lat, lng);
  const entry = cache[key];

  if (!entry) return undefined;

  // Check if cache entry is expired
  if (Date.now() - entry.timestamp > GEOCODE_CACHE_TTL) {
    return undefined;
  }

  console.log("[Geocode] Cache hit:", key);
  return entry.address;
}

function setCachedAddress(lat: number, lng: number, address: string | null): void {
  const cache = getCache();
  const key = getCacheKey(lat, lng);

  // Prune old entries if cache is too large
  const keys = Object.keys(cache);
  if (keys.length >= GEOCODE_CACHE_MAX_SIZE) {
    // Remove oldest entries
    const sortedKeys = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
    const toRemove = sortedKeys.slice(0, Math.floor(GEOCODE_CACHE_MAX_SIZE / 4));
    toRemove.forEach((k) => delete cache[k]);
  }

  cache[key] = { address, timestamp: Date.now() };
  setCache(cache);
}

// Reverse geocoding using Nominatim (OpenStreetMap)
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  // Check cache first
  const cached = getCachedAddress(lat, lng);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "mn,en",
        },
      }
    );

    if (!response.ok) {
      setCachedAddress(lat, lng, null);
      return null;
    }

    const data = await response.json();

    // First try display_name which often has more detail
    const displayParts = data.display_name?.split(",").map((s: string) => s.trim()).filter(Boolean) || [];

    let result: string | null = null;

    if (data.address) {
      const addr = data.address;
      const parts: string[] = [];

      // 1. Name of place/POI if available (tourism, amenity, building, shop, residential)
      const placeName = addr.tourism || addr.amenity || addr.building || addr.shop || addr.residential;
      if (placeName) {
        parts.push(placeName);
      }

      // 2. Street address with house number
      if (addr.road) {
        if (addr.house_number) {
          parts.push(`${addr.road} ${addr.house_number}`);
        } else {
          parts.push(addr.road);
        }
      } else if (addr.house_number) {
        parts.push(addr.house_number);
      }

      // 3. Neighbourhood/microdistrict/quarter/suburb (more specific areas)
      if (addr.neighbourhood) {
        parts.push(addr.neighbourhood);
      } else if (addr.quarter) {
        parts.push(addr.quarter);
      } else if (addr.suburb) {
        parts.push(addr.suburb);
      }

      // 4. City district (дүүрэг)
      if (addr.city_district) {
        parts.push(addr.city_district);
      } else if (addr.district) {
        parts.push(addr.district);
      }

      // 5. City/town
      const city = addr.city || addr.town || addr.village;
      if (city) {
        parts.push(city);
      }

      // If we have good details, return them
      if (parts.length >= 3) {
        result = parts.slice(0, 5).join(", ");
      } else if (displayParts.length > parts.length) {
        // Otherwise use display_name which may have more info
        // Remove country from display_name
        const filtered = displayParts.filter((p: string) =>
          !p.includes("Монгол") && !p.match(/^\d{5}$/) // Remove country and postal code
        );
        result = filtered.slice(0, 4).join(", ");
      } else if (parts.length > 0) {
        result = parts.join(", ");
      }
    }

    // Final fallback to display_name
    if (!result && displayParts.length > 0) {
      const filtered = displayParts.filter((p: string) =>
        !p.includes("Монгол") && !p.match(/^\d{5}$/)
      );
      result = filtered.slice(0, 4).join(", ");
    }

    // Cache the result
    setCachedAddress(lat, lng, result);
    return result;
  } catch {
    setCachedAddress(lat, lng, null);
    return null;
  }
}

export function LocationPickerMap({
  coordinates,
  onCoordinatesChange,
  className,
}: LocationPickerMapProps) {
  const [addressText, setAddressText] = React.useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = React.useState(false);

  // Debounce coordinates to prevent excessive geocoding during map dragging
  const debouncedCoordinates = useDebouncedValue(coordinates, 500);

  // Fetch address when debounced coordinates change
  React.useEffect(() => {
    if (!debouncedCoordinates) {
      setAddressText(null);
      return;
    }

    setIsLoadingAddress(true);
    reverseGeocode(debouncedCoordinates[0], debouncedCoordinates[1])
      .then((address) => {
        setAddressText(address);
        // Pass address back to parent for auto-fill
        onCoordinatesChange(debouncedCoordinates, address);
      })
      .finally(() => {
        setIsLoadingAddress(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCoordinates?.[0], debouncedCoordinates?.[1]]);

  return (
    <div className={cn("space-y-2 w-full overflow-hidden", className)}>
      {/* Header */}
      <p className="text-sm font-medium flex items-center gap-2">
        <MapPin className="h-4 w-4 text-emerald-500" />
        Газрын зурагт дарж байршил сонгоно уу
      </p>

      {/* Map - always visible */}
      <LocationPickerMapLeaflet
        coordinates={coordinates}
        onCoordinatesChange={onCoordinatesChange}
        addressText={addressText}
      />

      {/* Address display */}
      {coordinates && (
        <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 w-full">
          <Navigation className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          {isLoadingAddress ? (
            <span className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300 flex-1">
              <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              Хаяг тодорхойлж байна...
            </span>
          ) : (
            <span className="text-sm text-emerald-700 dark:text-emerald-300 flex-1 wrap-break-word">
              {addressText || "Хаяг олдсонгүй"}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
            onClick={() => onCoordinatesChange(null)}
          >
            Арилгах
          </Button>
        </div>
      )}
    </div>
  );
}
