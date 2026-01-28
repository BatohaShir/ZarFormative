"use client";

import * as React from "react";
import { Navigation2, Loader2, Expand } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { ListingWithRelations } from "@/components/listing-card";
import { TILE_URL, DEFAULT_MAP_CENTER } from "@/components/ui/base-map";

const DEFAULT_ZOOM = 6;
const CITY_ZOOM = 12;

interface ServicesMapLeafletProps {
  listings: ListingWithRelations[];
  isFullscreen?: boolean;
  onFullscreen?: () => void;
  onLocationSelect?: (districtId: string | null, aimagId: string | null) => void;
}

// Inner component that uses Leaflet - only rendered on client
function ServicesMapLeafletInner({ listings, isFullscreen, onFullscreen, onLocationSelect }: ServicesMapLeafletProps) {
  const [myLocation, setMyLocation] = React.useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const [flyToPosition, setFlyToPosition] = React.useState<[number, number] | null>(null);
  const [leafletLoaded, setLeafletLoaded] = React.useState(false);
  const leafletRef = React.useRef<typeof import("leaflet") | null>(null);
  const reactLeafletRef = React.useRef<typeof import("react-leaflet") | null>(null);

  // Load leaflet on mount
  React.useEffect(() => {
    Promise.all([
      import("leaflet"),
      import("react-leaflet"),
    ]).then(([L, RL]) => {
      leafletRef.current = L;
      reactLeafletRef.current = RL;
      setLeafletLoaded(true);
    });
  }, []);

  // Get listings with coordinates
  // Logic:
  // - service_type "on_site" (клиент приходит к исполнителю) → точные координаты listing.latitude/longitude
  // - service_type "remote" (исполнитель приезжает к клиенту) → координаты aimag/district
  const listingsWithCoords = React.useMemo(() => {
    return listings.filter((listing) => {
      // Для on_site услуг - проверяем точные координаты
      if (listing.service_type === "on_site") {
        const lat = listing.latitude ? Number(listing.latitude) : null;
        const lng = listing.longitude ? Number(listing.longitude) : null;
        return lat && lng;
      }
      // Для remote услуг - проверяем координаты района/аймака
      const lat = listing.district?.latitude || listing.aimag?.latitude;
      const lng = listing.district?.longitude || listing.aimag?.longitude;
      return lat && lng;
    }).map((listing) => {
      let lat: number;
      let lng: number;

      if (listing.service_type === "on_site") {
        // Точные координаты для услуг на месте исполнителя
        lat = listing.latitude ? Number(listing.latitude) : 0;
        lng = listing.longitude ? Number(listing.longitude) : 0;
      } else {
        // Координаты района/аймака для remote услуг
        lat = listing.district?.latitude || listing.aimag?.latitude || 0;
        lng = listing.district?.longitude || listing.aimag?.longitude || 0;
      }

      return { ...listing, lat, lng };
    });
  }, [listings]);

  // Group listings by location (for clustering)
  const groupedListings = React.useMemo(() => {
    const groups: Record<string, typeof listingsWithCoords> = {};

    listingsWithCoords.forEach((listing) => {
      const key = `${listing.lat.toFixed(2)}_${listing.lng.toFixed(2)}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(listing);
    });

    return Object.values(groups);
  }, [listingsWithCoords]);

  // Handle my location button
  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setMyLocation(coords);
        setFlyToPosition(coords);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle location click - filter by district/aimag
  const handleLocationClick = (districtId: string | null, aimagId: string | null) => {
    if (onLocationSelect) {
      onLocationSelect(districtId, aimagId);
    }
  };

  // Show loading while leaflet loads
  if (!leafletLoaded || !leafletRef.current || !reactLeafletRef.current) {
    return (
      <div className="w-full h-full bg-muted/50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const L = leafletRef.current;
  const { MapContainer, TileLayer, Marker, Circle, useMap } = reactLeafletRef.current;

  // Create marker icons
  const createClusterIcon = (count: number) => {
    return L.divIcon({
      className: "cluster-marker",
      html: `<div class="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"><span class="text-white text-xs font-bold">${count}</span></div>`,
      iconSize: [32, 32] as [number, number],
      iconAnchor: [16, 16] as [number, number],
      popupAnchor: [0, -16] as [number, number],
    });
  };

  const createMyLocationIcon = () => {
    return L.divIcon({
      className: "my-location-marker",
      html: `<div class="relative"><div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div><div class="absolute inset-0 w-4 h-4 bg-red-500/30 rounded-full animate-ping"></div></div>`,
      iconSize: [16, 16] as [number, number],
      iconAnchor: [8, 8] as [number, number],
    });
  };

  // Map bounds controller component
  function MapBoundsController() {
    const map = useMap();

    React.useEffect(() => {
      if (listingsWithCoords.length === 0) return;

      const coords: [number, number][] = listingsWithCoords.map((l) => [l.lat, l.lng]);

      if (coords.length > 0) {
        if (coords.length === 1) {
          map.setView(coords[0], CITY_ZOOM);
        } else {
          const bounds = L.latLngBounds(coords);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: CITY_ZOOM });
        }
      }
    }, [map, listingsWithCoords]);

    return null;
  }

  // Fly to location controller
  function FlyToController() {
    const map = useMap();

    React.useEffect(() => {
      if (flyToPosition) {
        map.flyTo(flyToPosition, 14, { duration: 1 });
      }
    }, [map, flyToPosition]);

    return null;
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
      >
        <MapBoundsController />
        <FlyToController />

        {/* OSM tile layer - dark theme via CSS */}
        <TileLayer url={TILE_URL} maxZoom={19} />

      {/* Gradient overlay for better button visibility */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-linear-to-b from-black/30 to-transparent z-400 pointer-events-none" />

        {/* My location marker */}
        {myLocation && (
          <>
            <Marker position={myLocation} icon={createMyLocationIcon()} />
            <Circle
              center={myLocation}
              radius={100}
              pathOptions={{
                color: "#ef4444",
                fillColor: "#ef4444",
                fillOpacity: 0.1,
                weight: 1,
              }}
            />
          </>
        )}

        {/* Listing markers - show count only, click to filter */}
        {groupedListings.map((group, groupIndex) => {
          const firstListing = group[0];
          const districtId = firstListing.district?.id || null;
          const aimagId = firstListing.aimag?.id || null;

          return (
            <Marker
              key={`group-${groupIndex}`}
              position={[firstListing.lat, firstListing.lng]}
              icon={createClusterIcon(group.length)}
              eventHandlers={{
                click: () => handleLocationClick(districtId, aimagId),
              }}
            />
          );
        })}
      </MapContainer>

      {/* My location button - green when active */}
      <button
        onClick={handleMyLocation}
        disabled={isLocating}
        className={`absolute z-500 w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors disabled:opacity-50 border ${
          isFullscreen ? "top-20 right-3" : "top-3 left-3"
        } ${
          myLocation
            ? "bg-green-500 hover:bg-green-600 border-green-600"
            : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
        }`}
        title="Миний байршил"
      >
        {isLocating ? (
          <Loader2 className={`h-5 w-5 animate-spin ${myLocation ? "text-white" : "text-gray-700 dark:text-gray-300"}`} />
        ) : (
          <Navigation2 className={`h-5 w-5 rotate-45 ${myLocation ? "text-white" : "text-gray-700 dark:text-gray-300"}`} />
        )}
      </button>

      {/* Fullscreen button (only in preview mode) */}
      {!isFullscreen && onFullscreen && (
        <button
          onClick={onFullscreen}
          className="absolute bottom-8 right-3 z-500 w-10 h-10 rounded-lg bg-white dark:bg-gray-800 shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
          title="Том дэлгэцээр"
        >
          <Expand className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}
    </div>
  );
}

// Export wrapped component that only renders on client
export function ServicesMapLeaflet(props: ServicesMapLeafletProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-muted/50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ServicesMapLeafletInner {...props} />;
}
