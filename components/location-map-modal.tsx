"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  X,
  Maximize2,
  Minimize2,
  Navigation2,
  LocateFixed,
  Route,
  Footprints,
  Car,
  Loader2,
  ChevronUp,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TILE_URL } from "@/components/map-constants";
import { cn } from "@/lib/utils";

// Module-level singleton icons — created once per app lifetime.
const LISTING_ICON: L.DivIcon = L.divIcon({
  className: "zf-marker-listing",
  html: `<div style="
    width:34px;height:34px;
    background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:3px solid white;
    box-shadow:0 6px 16px rgba(15,23,42,.35);
  "><div style="
    width:10px;height:10px;background:white;border-radius:50%;
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  "></div></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

const USER_ICON: L.DivIcon = L.divIcon({
  className: "zf-marker-user",
  html: `<div style="
    width:18px;height:18px;background:#22c55e;border-radius:50%;
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Haversine distance in meters — used as a fallback when OSRM can't build a route.
function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} м`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)} км`;
  return `${Math.round(meters / 1000)} км`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours} ц ${rem} мин` : `${hours} ц`;
}

type RouteMode = "foot" | "driving";

interface RouteResult {
  mode: RouteMode;
  distanceMeters: number;
  durationSeconds: number;
  line: [number, number][];
  approximate?: boolean;
}

// Rough fallback speeds when we have to estimate ETA from straight distance.
const FOOT_SPEED_MPS = 5000 / 3600; // ≈ 1.39 m/s
const DRIVING_SPEED_MPS = 50000 / 3600; // ≈ 13.89 m/s

interface LocationMapModalProps {
  coordinates: [number, number];
  address: string;
  title: string;
  onClose: () => void;
}

// Recalc size after transitions. Leaflet needs explicit nudges when its
// container animates (modal open, fullscreen toggle).
function MapResizeHandler({ deps }: { deps: React.DependencyList }) {
  const map = useMap();
  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    [0, 80, 200, 360, 600].forEach((ms) => {
      timers.push(setTimeout(() => map.invalidateSize(), ms));
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return null;
}

function FlyToPosition({
  position,
  trigger,
  zoom = 16,
}: {
  position: [number, number] | null;
  trigger: number;
  zoom?: number;
}) {
  const map = useMap();
  React.useEffect(() => {
    if (position && trigger > 0) {
      map.flyTo(position, zoom, { duration: 0.9 });
    }
  }, [map, position, trigger, zoom]);
  return null;
}

function FitBoundsToRoute({ line, trigger }: { line: [number, number][] | null; trigger: number }) {
  const map = useMap();
  React.useEffect(() => {
    if (line && line.length >= 2 && trigger > 0) {
      const bounds = L.latLngBounds(line.map(([la, ln]) => L.latLng(la, ln)));
      map.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 0.8 });
    }
  }, [map, line, trigger]);
  return null;
}

export function LocationMapModal({ coordinates, address, title, onClose }: LocationMapModalProps) {
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [flyToListingTrigger, setFlyToListingTrigger] = React.useState(0);
  const [flyToUserTrigger, setFlyToUserTrigger] = React.useState(0);
  const [locError, setLocError] = React.useState<string | null>(null);

  // Routing state
  const [routeSheetOpen, setRouteSheetOpen] = React.useState(false);
  const [selectedMode, setSelectedMode] = React.useState<RouteMode>("driving");
  const [route, setRoute] = React.useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = React.useState(false);
  const [routeError, setRouteError] = React.useState<string | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = React.useState(0);

  // ESC closes the sheet first, otherwise the modal.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (routeSheetOpen) setRouteSheetOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, routeSheetOpen]);

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Auto-dismiss error toasts after 3.5s
  React.useEffect(() => {
    if (!locError && !routeError) return;
    const t = setTimeout(() => {
      setLocError(null);
      setRouteError(null);
    }, 3500);
    return () => clearTimeout(t);
  }, [locError, routeError]);

  // Auto-request geolocation on open.
  React.useEffect(() => {
    if (!navigator.geolocation) {
      setLocError("Геолокация дэмжигдэхгүй байна");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const haversineFallback = React.useMemo(
    () => (userLocation ? haversineMeters(userLocation, coordinates) : null),
    [userLocation, coordinates]
  );

  const handleGetMyLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!navigator.geolocation) {
      setLocError("Геолокация дэмжигдэхгүй байна");
      return;
    }
    setIsLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setIsLocating(false);
        setFlyToUserTrigger((p) => p + 1);
      },
      () => {
        setLocError("Байршил тодорхойлоход алдаа гарлаа");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFullscreen((v) => !v);
  };

  const handleCenterOnListing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFlyToListingTrigger((p) => p + 1);
  };

  const handleOpenRouteSheet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRouteError(null);
    setRouteSheetOpen(true);
  };

  const fetchRoute = React.useCallback(
    async (mode: RouteMode, opts?: { silent?: boolean }) => {
      if (!userLocation) return;
      setRouteLoading(true);
      setRouteError(null);
      try {
        const [uLat, uLng] = userLocation;
        const [dLat, dLng] = coordinates;
        const url = `https://router.project-osrm.org/route/v1/${mode}/${uLng},${uLat};${dLng},${dLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OSRM ${res.status}`);
        const json: {
          code: string;
          routes?: Array<{
            distance: number;
            duration: number;
            geometry: { coordinates: [number, number][] };
          }>;
        } = await res.json();
        if (json.code !== "Ok" || !json.routes?.length) throw new Error("no-route");
        const r = json.routes[0];
        // OSRM returns [lng, lat]; flip to [lat, lng] for Leaflet.
        const line: [number, number][] = r.geometry.coordinates.map(([ln, la]) => [la, ln]);
        setRoute({
          mode,
          distanceMeters: r.distance,
          durationSeconds: r.duration,
          line,
        });
        setFitBoundsTrigger((p) => p + 1);
        setRouteSheetOpen(false);
      } catch {
        // No route from OSRM — fall back to a straight line so the user at
        // least sees the destination direction.
        const dist = haversineMeters(userLocation, coordinates);
        const speed = mode === "foot" ? FOOT_SPEED_MPS : DRIVING_SPEED_MPS;
        setRoute({
          mode,
          distanceMeters: dist,
          durationSeconds: dist / speed,
          line: [userLocation, coordinates],
          approximate: true,
        });
        setFitBoundsTrigger((p) => p + 1);
        setRouteSheetOpen(false);
        if (!opts?.silent) {
          setRouteError("Яг маршрут олдсонгүй. Ойролцоогоор харуулж байна.");
        }
      } finally {
        setRouteLoading(false);
      }
    },
    [userLocation, coordinates]
  );

  // Auto-build a route once we get the user location.
  const autoRouteFiredRef = React.useRef(false);
  React.useEffect(() => {
    if (!userLocation || route || autoRouteFiredRef.current) return;
    autoRouteFiredRef.current = true;
    fetchRoute(selectedMode, { silent: true });
  }, [userLocation, route, selectedMode, fetchRoute]);

  const handleBuildRoute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fetchRoute(selectedMode);
  };

  const handleClearRoute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRoute(null);
  };

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          "relative bg-background shadow-2xl overflow-hidden flex flex-col",
          "w-full sm:w-[calc(100%-2rem)] sm:max-w-2xl",
          "rounded-t-3xl sm:rounded-3xl",
          "transition-[height,max-height,max-width,border-radius] duration-300",
          "animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95",
          isFullscreen
            ? "h-dvh sm:h-[calc(100dvh-2rem)] sm:max-w-[calc(100vw-2rem)] rounded-t-none sm:rounded-3xl"
            : "h-[85dvh] sm:h-auto"
        )}
        style={{ transitionTimingFunction: "var(--ease-brand,cubic-bezier(.2,.8,.2,1))" }}
        onClick={stop}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 sm:px-5 pt-1 sm:pt-5 pb-3 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold text-[15px] sm:text-base leading-tight truncate">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{address}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleToggleFullscreen}
              aria-label={isFullscreen ? "Жижигрүүлэх" : "Томруулах"}
              className="w-9 h-9 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-full hover:bg-muted text-foreground transition-colors touch-manipulation"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4.5 h-4.5" />
              ) : (
                <Maximize2 className="w-4.5 h-4.5" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              aria-label="Хаах"
              className="w-9 h-9 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-full bg-muted hover:bg-muted/70 text-foreground transition-colors touch-manipulation"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="relative w-full flex-1 min-h-80 sm:h-120 bg-muted">
          <MapContainer
            center={coordinates}
            zoom={16}
            scrollWheelZoom
            zoomControl={false}
            attributionControl={false}
            className="absolute inset-0 h-full w-full"
            preferCanvas
            fadeAnimation={false}
          >
            <TileLayer url={TILE_URL} maxZoom={19} keepBuffer={4} updateWhenIdle />
            <Marker position={coordinates} icon={LISTING_ICON} />

            {userLocation && (
              <>
                <Marker position={userLocation} icon={USER_ICON} />
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

            {route && (
              <>
                {/* White halo for contrast on any tile */}
                <Polyline
                  positions={route.line}
                  pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.9 }}
                />
                <Polyline
                  positions={route.line}
                  pathOptions={{
                    color: route.mode === "foot" ? "#10b981" : "#2563eb",
                    weight: 5,
                    opacity: 0.95,
                    lineCap: "round",
                    lineJoin: "round",
                    dashArray: route.approximate
                      ? "8 10"
                      : route.mode === "foot"
                        ? "1 10"
                        : undefined,
                  }}
                />
              </>
            )}

            <FlyToPosition position={userLocation} trigger={flyToUserTrigger} />
            <FlyToPosition position={coordinates} trigger={flyToListingTrigger} />
            <FitBoundsToRoute line={route?.line ?? null} trigger={fitBoundsTrigger} />
            <MapResizeHandler deps={[isFullscreen]} />
          </MapContainer>

          {/* Top scrim for control legibility */}
          <div className="pointer-events-none absolute top-0 inset-x-0 h-10 bg-linear-to-b from-black/10 to-transparent" />

          {/* Distance / route info chip (top-left) */}
          {(route || haversineFallback !== null) && (
            <div className="absolute top-3 left-3 z-1000">
              <div className="inline-flex items-center gap-1.5 h-9 pl-3 pr-3 rounded-full bg-background/95 backdrop-blur-md ring-1 ring-border shadow-md">
                {route ? (
                  route.mode === "foot" ? (
                    <Footprints className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Car className="w-4 h-4 text-blue-600" />
                  )
                ) : (
                  <Route className="w-4 h-4 text-blue-600" />
                )}
                <span className="text-xs font-semibold tabular">
                  {route
                    ? `${route.approximate ? "~" : ""}${formatDistance(route.distanceMeters)} · ${route.approximate ? "~" : ""}${formatDuration(route.durationSeconds)}`
                    : formatDistance(haversineFallback!)}
                </span>
                {route && (
                  <button
                    onClick={handleClearRoute}
                    aria-label="Маршрут арилгах"
                    className="ml-1 w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Floating control group (bottom-right) */}
          <div className="absolute bottom-3 right-3 z-1000 flex flex-col overflow-hidden rounded-2xl bg-background/95 backdrop-blur-md ring-1 ring-border shadow-lg">
            <button
              onClick={handleGetMyLocation}
              disabled={isLocating}
              aria-label="Миний байршил"
              aria-pressed={!!userLocation}
              className={cn(
                "w-11 h-11 inline-flex items-center justify-center transition-colors touch-manipulation",
                userLocation
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "hover:bg-muted text-foreground",
                "disabled:opacity-50"
              )}
            >
              <Navigation2 className={cn("w-5 h-5 rotate-45", isLocating && "animate-pulse")} />
            </button>
            <div className="h-px bg-border" />
            <button
              onClick={handleCenterOnListing}
              aria-label="Үйлчилгээний байршил руу"
              className="w-11 h-11 inline-flex items-center justify-center hover:bg-muted text-blue-600 transition-colors touch-manipulation"
            >
              <LocateFixed className="w-5 h-5" />
            </button>
          </div>

          {/* Legend (bottom-left, desktop only) */}
          <div className="hidden sm:flex absolute bottom-3 left-3 z-1000 flex-col gap-1 rounded-xl bg-background/95 backdrop-blur-md ring-1 ring-border shadow-md px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
              Үйлчилгээний газар
            </div>
            {userLocation && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                Та
              </div>
            )}
          </div>

          {/* Error toast */}
          {(locError || routeError) && (
            <div
              role="alert"
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-1001 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/95 backdrop-blur-md ring-1 ring-destructive/40 text-destructive text-[11px] font-medium shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              {locError ?? routeError}
            </div>
          )}

          {/* Pull-tab — opens the route mode sheet */}
          {!routeSheetOpen && (isLocating || userLocation) && (
            <button
              onClick={handleOpenRouteSheet}
              aria-label="Маршрут сонгох"
              className={cn(
                "absolute bottom-4 left-1/2 -translate-x-1/2 z-1000",
                "inline-flex items-center gap-1.5 h-11 pl-4 pr-5 rounded-full",
                "bg-blue-600 text-white shadow-lg ring-1 ring-blue-700/30",
                "hover:bg-blue-700 active:scale-[0.97] transition-[background-color,transform] duration-200",
                "touch-manipulation animate-in fade-in slide-in-from-bottom-2 duration-200"
              )}
            >
              <ChevronUp className="w-4 h-4" />
              <span className="text-sm font-semibold">Маршрут</span>
            </button>
          )}
        </div>

        {/* Route mode sheet — overlays the whole modal */}
        {routeSheetOpen && (
          <button
            type="button"
            aria-label="Хаах"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setRouteSheetOpen(false);
            }}
            className="absolute inset-0 z-1002 bg-black/40 animate-in fade-in duration-200 cursor-default"
          />
        )}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-1003 transition-transform duration-300 ease-out",
            routeSheetOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
          )}
          aria-hidden={!routeSheetOpen}
          onClick={stop}
        >
          <div className="relative bg-background border-t border-border rounded-t-2xl shadow-2xl pb-[max(env(safe-area-inset-bottom),1rem)]">
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 sm:px-5 pt-2 pb-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Тээвэрлэх хэрэгсэл</h4>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedMode("foot");
                  }}
                  aria-pressed={selectedMode === "foot"}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5",
                    "h-20 rounded-2xl ring-1 transition-colors touch-manipulation",
                    selectedMode === "foot"
                      ? "bg-blue-500/10 ring-blue-500 text-blue-600 dark:text-blue-400"
                      : "bg-muted ring-border text-foreground hover:bg-muted/70"
                  )}
                >
                  <Footprints className="w-6 h-6" />
                  <span className="text-xs font-semibold">Явган</span>
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedMode("driving");
                  }}
                  aria-pressed={selectedMode === "driving"}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5",
                    "h-20 rounded-2xl ring-1 transition-colors touch-manipulation",
                    selectedMode === "driving"
                      ? "bg-blue-500/10 ring-blue-500 text-blue-600 dark:text-blue-400"
                      : "bg-muted ring-border text-foreground hover:bg-muted/70"
                  )}
                >
                  <Car className="w-6 h-6" />
                  <span className="text-xs font-semibold">Машинаар</span>
                </button>
              </div>

              <button
                onClick={handleBuildRoute}
                disabled={routeLoading || !userLocation}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2",
                  "h-11 rounded-full font-semibold text-sm text-white",
                  "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  "transition-[background-color,transform] duration-200 touch-manipulation",
                  "shadow-sm"
                )}
                style={{ transitionTimingFunction: "var(--ease-brand,cubic-bezier(.2,.8,.2,1))" }}
              >
                {routeLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Татаж байна...
                  </>
                ) : (
                  <>
                    <Route className="w-4 h-4" />
                    Маршрут харах
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
