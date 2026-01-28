"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

// Reverse geocoding using Nominatim (OpenStreetMap)
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "mn,en",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    // First try display_name which often has more detail
    const displayParts = data.display_name?.split(",").map((s: string) => s.trim()).filter(Boolean) || [];

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
        return parts.slice(0, 5).join(", ");
      }

      // Otherwise use display_name which may have more info
      if (displayParts.length > parts.length) {
        // Remove country from display_name
        const filtered = displayParts.filter((p: string) =>
          !p.includes("Монгол") && !p.match(/^\d{5}$/) // Remove country and postal code
        );
        return filtered.slice(0, 4).join(", ");
      }

      if (parts.length > 0) {
        return parts.join(", ");
      }
    }

    // Final fallback to display_name
    if (displayParts.length > 0) {
      const filtered = displayParts.filter((p: string) =>
        !p.includes("Монгол") && !p.match(/^\d{5}$/)
      );
      return filtered.slice(0, 4).join(", ");
    }

    return null;
  } catch {
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

  // Fetch address when coordinates change
  React.useEffect(() => {
    if (!coordinates) {
      setAddressText(null);
      return;
    }

    setIsLoadingAddress(true);
    reverseGeocode(coordinates[0], coordinates[1])
      .then((address) => {
        setAddressText(address);
        // Pass address back to parent for auto-fill
        onCoordinatesChange(coordinates, address);
      })
      .finally(() => {
        setIsLoadingAddress(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates?.[0], coordinates?.[1]]);

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
