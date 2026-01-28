"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Loader2, Navigation2, AlertCircle, Car, Clock, X, ZoomIn, ZoomOut, Maximize2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TILE_URL, DEFAULT_MAP_CENTER } from "@/components/ui/base-map";

interface LocationData {
  id: string;
  request_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  is_active: boolean;
  updated_at: string;
}

interface RouteInfo {
  coordinates: [number, number][];
  distance: number; // в метрах
  duration: number; // в секундах
}

interface LiveTrackingMapLeafletProps {
  requestId: string;
  clientId: string;
  providerId: string;
  clientName: string;
  providerName: string;
  serviceLocation?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  className?: string;
  isActiveJob?: boolean;
}

// Создаём кастомные иконки
const createClientIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px;
      height: 32px;
      background: #3b82f6;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createProviderIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px;
      height: 32px;
      background: #22c55e;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createServiceIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px;
      height: 32px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Байршил хандах зөвшөөрөл татгалзсан";
    case error.POSITION_UNAVAILABLE:
      return "Байршил тодорхойлох боломжгүй";
    case error.TIMEOUT:
      return "Байршил тодорхойлох хугацаа дууссан";
    default:
      return "Байршил тодорхойлоход алдаа гарлаа";
  }
}

// Компонент для управления картой
function MapController({
  center,
  zoom
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  React.useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
}

// Полноэкранная модалка карты
function FullscreenLiveMap({
  mapCenter,
  clientLocation,
  providerLocation,
  clientName,
  providerName,
  serviceLocation,
  routeInfo,
  clientIcon,
  providerIcon,
  serviceIcon,
  isActiveJob,
  isClient,
  isProvider,
  isTracking,
  error,
  onStartTracking,
  onStopTracking,
  onClose,
}: {
  mapCenter: [number, number];
  clientLocation: LocationData | undefined;
  providerLocation: LocationData | undefined;
  clientName: string;
  providerName: string;
  serviceLocation?: { latitude: number; longitude: number; radius?: number };
  routeInfo: RouteInfo | null;
  clientIcon: L.DivIcon;
  providerIcon: L.DivIcon;
  serviceIcon: L.DivIcon;
  isActiveJob: boolean;
  isClient: boolean;
  isProvider: boolean;
  isTracking: boolean;
  error: string | null;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onClose: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = React.useRef<any>(null);
  const [zoom, setZoom] = React.useState(14);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 1, 18));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 1, 10));
  const handleCenter = () => {
    if (mapRef.current) {
      mapRef.current.setView(mapCenter, zoom);
    }
  };

  // Центрировать на мою локацию (если отслеживание активно)
  const handleCenterOnMyLocation = () => {
    if (!mapRef.current) return;

    // Определяем мою локацию в зависимости от роли
    const myLocation = isClient ? clientLocation : providerLocation;

    if (myLocation) {
      mapRef.current.setView([myLocation.latitude, myLocation.longitude], 16);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-9999 flex items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <div
        className="leaflet-map-modal relative w-full h-full md:w-[90vw] md:max-w-4xl md:h-[85vh] shadow-2xl md:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-1001 bg-linear-to-b from-black/70 via-black/40 to-transparent p-4 pb-8">
          <div className="flex items-start justify-between">
            <div className="text-white drop-shadow-lg">
              <h3 className="font-semibold text-lg drop-shadow-md">Байршлыг бодит цагаар хянах</h3>
              <div className="flex items-center gap-3 mt-2 text-sm">
                {clientLocation && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    {clientName}
                  </span>
                )}
                {providerLocation && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    {providerName}
                  </span>
                )}
              </div>
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
            center={mapCenter}
            zoom={zoom}
            scrollWheelZoom={true}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
            attributionControl={false}
            ref={mapRef}
          >
            <MapController center={mapCenter} zoom={zoom} />
            <TileLayer url={TILE_URL} maxZoom={19} />

            {/* Маркер места услуги */}
            {serviceLocation && serviceLocation.latitude && serviceLocation.longitude && (
              <>
                <Marker
                  position={[serviceLocation.latitude, serviceLocation.longitude]}
                  icon={serviceIcon}
                >
                  <Popup>
                    <div className="text-sm font-medium">Үйлчилгээний газар</div>
                  </Popup>
                </Marker>
                {serviceLocation.radius && (
                  <Circle
                    center={[serviceLocation.latitude, serviceLocation.longitude]}
                    radius={serviceLocation.radius}
                    pathOptions={{
                      color: "#ef4444",
                      fillColor: "#ef4444",
                      fillOpacity: 0.1,
                      weight: 2,
                    }}
                  />
                )}
              </>
            )}

            {/* Маркер клиента */}
            {clientLocation && (
              <Marker
                position={[clientLocation.latitude, clientLocation.longitude]}
                icon={clientIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-medium text-blue-600">{clientName}</div>
                    <div className="text-muted-foreground text-xs">Захиалагч</div>
                    {clientLocation.accuracy && (
                      <div className="text-xs">Нарийвчлал: ±{Math.round(clientLocation.accuracy)}м</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Маркер исполнителя */}
            {providerLocation && (
              <Marker
                position={[providerLocation.latitude, providerLocation.longitude]}
                icon={providerIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-medium text-green-600">{providerName}</div>
                    <div className="text-muted-foreground text-xs">Үйлчилгээ үзүүлэгч</div>
                    {providerLocation.accuracy && (
                      <div className="text-xs">Нарийвчлал: ±{Math.round(providerLocation.accuracy)}м</div>
                    )}
                    {providerLocation.speed && providerLocation.speed > 0 && (
                      <div className="text-xs">Хурд: {Math.round(providerLocation.speed * 3.6)} км/ц</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Маршрут */}
            {routeInfo && routeInfo.coordinates.length > 1 && (
              <Polyline
                positions={routeInfo.coordinates}
                pathOptions={{
                  color: "#3b82f6",
                  weight: 4,
                  opacity: 0.8,
                  dashArray: "10, 10",
                }}
              />
            )}
          </MapContainer>

          {/* Controls */}
          <div className="absolute top-20 right-4 z-1000 flex flex-col gap-1.5">
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
            <button
              type="button"
              onClick={handleCenter}
              className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
              title="Төвлөрөх"
            >
              <MapPin className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            {/* Кнопка центрировать на мою локацию (только для исполнителя если отслеживание активно) */}
            {isTracking && isProvider && (
              <button
                type="button"
                onClick={handleCenterOnMyLocation}
                className="w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors border bg-green-500 hover:bg-green-600 border-green-600"
                title="Миний байршил руу"
              >
                <Navigation2 className="h-5 w-5 rotate-45 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-1001 p-4 pb-safe bg-linear-to-t from-black/60 via-black/30 to-transparent">
          {/* Route info */}
          {routeInfo && (
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                <Car className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {routeInfo.distance >= 1000
                    ? `${(routeInfo.distance / 1000).toFixed(1)} км`
                    : `${Math.round(routeInfo.distance)} м`}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {routeInfo.duration >= 3600
                    ? `${Math.floor(routeInfo.duration / 3600)} цаг ${Math.round((routeInfo.duration % 3600) / 60)} мин`
                    : `${Math.round(routeInfo.duration / 60)} мин`}
                </span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-white bg-red-500/90 rounded-lg px-3 py-2 mb-3">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{error}</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export function LiveTrackingMapLeaflet({
  requestId,
  clientId,
  providerId,
  clientName,
  providerName,
  serviceLocation,
  className,
  isActiveJob = false,
}: LiveTrackingMapLeafletProps) {
  const { user } = useAuth();
  const [locations, setLocations] = React.useState<Map<string, LocationData>>(new Map());
  const [isTracking, setIsTracking] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [routeInfo, setRouteInfo] = React.useState<RouteInfo | null>(null);
  const [showFullscreen, setShowFullscreen] = React.useState(false);

  const watchIdRef = React.useRef<number | null>(null);
  const routeFetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const isClient = user?.id === clientId;
  const isProvider = user?.id === providerId;

  // Иконки
  const clientIcon = React.useMemo(() => createClientIcon(), []);
  const providerIcon = React.useMemo(() => createProviderIcon(), []);
  const serviceIcon = React.useMemo(() => createServiceIcon(), []);

  // Загрузка начальных локаций
  React.useEffect(() => {
    const loadLocations = async () => {
      try {
        const { data, error } = await supabase
          .from("request_locations")
          .select("*")
          .eq("request_id", requestId)
          .eq("is_active", true);

        if (error) throw error;

        const newLocations = new Map<string, LocationData>();
        (data || []).forEach((loc: LocationData) => {
          newLocations.set(loc.user_id, loc);
        });
        setLocations(newLocations);
      } catch (err) {
        console.error("Error loading locations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLocations();
  }, [requestId, supabase]);

  // Подписка на realtime обновления
  React.useEffect(() => {
    const channel = supabase
      .channel(`request_locations:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_locations",
          filter: `request_id=eq.${requestId}`,
        },
        (payload: { eventType: string; new: LocationData; old: LocationData }) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newLoc = payload.new as LocationData;
            setLocations((prev) => {
              const updated = new Map(prev);
              if (newLoc.is_active) {
                updated.set(newLoc.user_id, newLoc);
              } else {
                updated.delete(newLoc.user_id);
              }
              return updated;
            });
          } else if (payload.eventType === "DELETE") {
            const oldLoc = payload.old as LocationData;
            setLocations((prev) => {
              const updated = new Map(prev);
              updated.delete(oldLoc.user_id);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, supabase]);

  // Функция обновления локации в БД и локально
  const updateMyLocation = React.useCallback(
    async (position: GeolocationPosition) => {
      if (!user?.id) return;

      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      const now = new Date().toISOString();

      // Сразу обновляем локальный state для мгновенного отображения
      const myLocationData: LocationData = {
        id: `${requestId}-${user.id}`,
        request_id: requestId,
        user_id: user.id,
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
        is_active: true,
        updated_at: now,
      };

      setLocations((prev) => {
        const updated = new Map(prev);
        updated.set(user.id, myLocationData);
        return updated;
      });

      // Отправляем в БД асинхронно
      try {
        const { error } = await supabase.from("request_locations").upsert(
          {
            request_id: requestId,
            user_id: user.id,
            latitude,
            longitude,
            accuracy,
            heading,
            speed,
            is_active: true,
            updated_at: now,
          },
          { onConflict: "request_id,user_id" }
        );

        if (error) throw error;
      } catch (err) {
        console.error("Error updating location:", err);
      }
    },
    [requestId, user?.id, supabase]
  );

  // Начать отслеживание
  const startTracking = React.useCallback(() => {
    if (!navigator.geolocation) {
      setError("Геолокация не поддерживается вашим браузером");
      return;
    }

    setError(null);
    setIsTracking(true);

    navigator.geolocation.getCurrentPosition(
      updateMyLocation,
      (err) => {
        setError(getGeolocationErrorMessage(err));
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      updateMyLocation,
      (err) => {
        setError(getGeolocationErrorMessage(err));
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    toast.success("Байршил хуваалцаж эхэллээ");
  }, [updateMyLocation]);

  // Остановить отслеживание
  const stopTracking = React.useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (user?.id) {
      await supabase
        .from("request_locations")
        .update({ is_active: false })
        .eq("request_id", requestId)
        .eq("user_id", user.id);
    }

    setIsTracking(false);
    toast.info("Байршил хуваалцахыг зогсоолоо");
  }, [requestId, user?.id, supabase]);

  // Cleanup при unmount
  React.useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Функция запроса маршрута через OSRM
  const fetchRoute = React.useCallback(
    async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
        );
        if (!response.ok) return;

        const data = await response.json();
        if (data.code !== "Ok" || !data.routes?.[0]) return;

        const route = data.routes[0];
        // GeoJSON координаты в формате [lng, lat], конвертируем в [lat, lng] для Leaflet
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]]
        );

        setRouteInfo({
          coordinates,
          distance: route.distance,
          duration: route.duration,
        });
      } catch (err) {
        console.error("Error fetching route:", err);
      }
    },
    []
  );

  // Обновление маршрута при изменении позиций (с debounce)
  React.useEffect(() => {
    const providerLoc = locations.get(providerId);

    // Определяем точку назначения: место услуги или локация клиента
    const destinationLat = serviceLocation?.latitude;
    const destinationLng = serviceLocation?.longitude;

    if (!providerLoc || !destinationLat || !destinationLng) {
      setRouteInfo(null);
      return;
    }

    // Debounce запросы маршрута (5 секунд)
    if (routeFetchTimeoutRef.current) {
      clearTimeout(routeFetchTimeoutRef.current);
    }

    routeFetchTimeoutRef.current = setTimeout(() => {
      fetchRoute(providerLoc.latitude, providerLoc.longitude, destinationLat, destinationLng);
    }, 5000);

    // Первый запрос сразу
    if (!routeInfo) {
      fetchRoute(providerLoc.latitude, providerLoc.longitude, destinationLat, destinationLng);
    }

    return () => {
      if (routeFetchTimeoutRef.current) {
        clearTimeout(routeFetchTimeoutRef.current);
      }
    };
  }, [locations, providerId, serviceLocation, fetchRoute, routeInfo]);

  // Центр карты
  const mapCenter = React.useMemo((): [number, number] => {
    if (serviceLocation && serviceLocation.latitude && serviceLocation.longitude) {
      return [serviceLocation.latitude, serviceLocation.longitude];
    }
    if (locations.size > 0) {
      const locs = Array.from(locations.values());
      const avgLat = locs.reduce((sum, l) => sum + l.latitude, 0) / locs.length;
      const avgLng = locs.reduce((sum, l) => sum + l.longitude, 0) / locs.length;
      return [avgLat, avgLng];
    }
    return DEFAULT_MAP_CENTER;
  }, [serviceLocation, locations]);

  if (isLoading) {
    return (
      <div className={cn("w-full h-50 rounded-xl bg-muted flex items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clientLocation = locations.get(clientId);
  const providerLocation = locations.get(providerId);

  // Рендер маркеров для карты (переиспользуется в preview и fullscreen)
  const renderMapContent = (interactive: boolean = false) => (
    <>
      <TileLayer url={TILE_URL} maxZoom={19} />

      {/* Маркер места услуги */}
      {serviceLocation && serviceLocation.latitude && serviceLocation.longitude && (
        <>
          <Marker
            position={[serviceLocation.latitude, serviceLocation.longitude]}
            icon={serviceIcon}
          >
            {interactive && (
              <Popup>
                <div className="text-sm font-medium">Үйлчилгээний газар</div>
              </Popup>
            )}
          </Marker>
          {serviceLocation.radius && (
            <Circle
              center={[serviceLocation.latitude, serviceLocation.longitude]}
              radius={serviceLocation.radius}
              pathOptions={{
                color: "#ef4444",
                fillColor: "#ef4444",
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
          )}
        </>
      )}

      {/* Маркер клиента */}
      {clientLocation && (
        <Marker
          position={[clientLocation.latitude, clientLocation.longitude]}
          icon={clientIcon}
        >
          {interactive && (
            <Popup>
              <div className="text-sm">
                <div className="font-medium text-blue-600">{clientName}</div>
                <div className="text-muted-foreground text-xs">Захиалагч</div>
                {clientLocation.accuracy && (
                  <div className="text-xs">Нарийвчлал: ±{Math.round(clientLocation.accuracy)}м</div>
                )}
              </div>
            </Popup>
          )}
        </Marker>
      )}

      {/* Маркер исполнителя */}
      {providerLocation && (
        <Marker
          position={[providerLocation.latitude, providerLocation.longitude]}
          icon={providerIcon}
        >
          {interactive && (
            <Popup>
              <div className="text-sm">
                <div className="font-medium text-green-600">{providerName}</div>
                <div className="text-muted-foreground text-xs">Үйлчилгээ үзүүлэгч</div>
                {providerLocation.accuracy && (
                  <div className="text-xs">Нарийвчлал: ±{Math.round(providerLocation.accuracy)}м</div>
                )}
                {providerLocation.speed && providerLocation.speed > 0 && (
                  <div className="text-xs">Хурд: {Math.round(providerLocation.speed * 3.6)} км/ц</div>
                )}
              </div>
            </Popup>
          )}
        </Marker>
      )}

      {/* Маршрут от исполнителя до места услуги */}
      {routeInfo && routeInfo.coordinates.length > 1 && (
        <Polyline
          positions={routeInfo.coordinates}
          pathOptions={{
            color: "#3b82f6",
            weight: 4,
            opacity: 0.8,
            dashArray: "10, 10",
          }}
        />
      )}
    </>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Preview карта - кликабельная, чистый UI */}
      <button
        type="button"
        onClick={() => setShowFullscreen(true)}
        className="w-full h-50 rounded-xl overflow-hidden relative z-0 group cursor-pointer ring-1 ring-border hover:ring-primary/50 transition-all"
      >
        <MapContainer
          center={mapCenter}
          zoom={14}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          doubleClickZoom={false}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          {renderMapContent(false)}
        </MapContainer>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center z-20">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
            <Maximize2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </div>
        </div>

        {/* Click hint */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
          <span className="text-[10px] bg-black/50 text-white px-2 py-1 rounded-full">
            Дарж томруулах
          </span>
        </div>
      </button>

      {/* Кнопка отслеживания - ТОЛЬКО для исполнителя */}
      {isActiveJob && isProvider && (
        <div className="space-y-2">
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 px-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{error}</span>
            </div>
          )}
          {isTracking ? (
            <Button
              variant="outline"
              onClick={stopTracking}
              className="w-full gap-2 border-green-500 text-green-600 hover:bg-green-50"
            >
              <Navigation2 className="h-4 w-4 rotate-45 text-green-500 animate-pulse" />
              Байршил хуваалцаж байна
            </Button>
          ) : (
            <Button
              onClick={startTracking}
              className="w-full gap-2 bg-green-500 hover:bg-green-600"
            >
              <Navigation2 className="h-4 w-4 rotate-45" />
              Байршил хуваалцах
            </Button>
          )}
        </div>
      )}

      {/* Fullscreen модалка */}
      {showFullscreen && (
        <FullscreenLiveMap
          mapCenter={mapCenter}
          clientLocation={clientLocation}
          providerLocation={providerLocation}
          clientName={clientName}
          providerName={providerName}
          serviceLocation={serviceLocation}
          routeInfo={routeInfo}
          clientIcon={clientIcon}
          providerIcon={providerIcon}
          serviceIcon={serviceIcon}
          isActiveJob={isActiveJob}
          isClient={isClient}
          isProvider={isProvider}
          isTracking={isTracking}
          error={error}
          onStartTracking={startTracking}
          onStopTracking={stopTracking}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </div>
  );
}
