"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, Locate, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Динамический импорт Leaflet компонентов (SSR не поддерживается)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

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

interface LiveTrackingMapProps {
  requestId: string;
  clientId: string;
  providerId: string;
  clientName: string;
  providerName: string;
  // Координаты адреса заявки (если есть)
  serviceLocation?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  className?: string;
  isActiveJob?: boolean; // Показывать ли трекинг (только для активных заявок)
}

// Компонент для обновления положения карты при изменении координат
function MapUpdater({
  positions,
  serviceLocation
}: {
  positions: [number, number][];
  serviceLocation?: { latitude: number; longitude: number }
}) {
  const map = React.useRef<L.Map | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLeaflet = async () => {
      const L = await import("leaflet");

      if (positions.length > 0) {
        const bounds = L.latLngBounds(positions);
        if (serviceLocation) {
          bounds.extend([serviceLocation.latitude, serviceLocation.longitude]);
        }
        // Карту нужно получить из контекста react-leaflet
      }
    };

    loadLeaflet();
  }, [positions, serviceLocation]);

  return null;
}

export function LiveTrackingMap({
  requestId,
  clientId,
  providerId,
  clientName,
  providerName,
  serviceLocation,
  className,
  isActiveJob = false,
}: LiveTrackingMapProps) {
  const { user } = useAuth();
  const [locations, setLocations] = React.useState<Map<string, LocationData>>(new Map());
  const [isTracking, setIsTracking] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = React.useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [icons, setIcons] = React.useState<{
    client: any;
    provider: any;
    service: any;
  }>({ client: null, provider: null, service: null });

  const watchIdRef = React.useRef<number | null>(null);
  const supabase = createClient();

  const isClient = user?.id === clientId;
  const isProvider = user?.id === providerId;

  // Загрузка Leaflet иконок
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLeaflet = async () => {
      const L = await import("leaflet");

      // Создаём кастомные иконки
      const clientIcon = L.divIcon({
        className: "custom-marker",
        html: `<div class="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const providerIcon = L.divIcon({
        className: "custom-marker",
        html: `<div class="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const serviceIcon = L.divIcon({
        className: "custom-marker",
        html: `<div class="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      setIcons({ client: clientIcon, provider: providerIcon, service: serviceIcon });
      setLeafletLoaded(true);
    };

    loadLeaflet();
  }, []);

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

  // Функция обновления локации в БД
  const updateMyLocation = React.useCallback(
    async (position: GeolocationPosition) => {
      if (!user?.id) return;

      const { latitude, longitude, accuracy, heading, speed } = position.coords;

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
            updated_at: new Date().toISOString(),
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

    // Сразу получить текущую позицию
    navigator.geolocation.getCurrentPosition(
      updateMyLocation,
      (err) => {
        setError(getGeolocationErrorMessage(err));
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Следить за изменениями
    watchIdRef.current = navigator.geolocation.watchPosition(
      updateMyLocation,
      (err) => {
        setError(getGeolocationErrorMessage(err));
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    toast.success("Отслеживание включено");
  }, [updateMyLocation]);

  // Остановить отслеживание
  const stopTracking = React.useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Отметить локацию как неактивную
    if (user?.id) {
      await supabase
        .from("request_locations")
        .update({ is_active: false })
        .eq("request_id", requestId)
        .eq("user_id", user.id);
    }

    setIsTracking(false);
    toast.info("Отслеживание выключено");
  }, [requestId, user?.id, supabase]);

  // Cleanup при unmount
  React.useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Центр карты
  const mapCenter = React.useMemo((): [number, number] => {
    // Если есть локация сервиса - используем её
    if (serviceLocation) {
      return [serviceLocation.latitude, serviceLocation.longitude];
    }
    // Если есть локации пользователей - используем среднее
    if (locations.size > 0) {
      const locs = Array.from(locations.values());
      const avgLat = locs.reduce((sum, l) => sum + l.latitude, 0) / locs.length;
      const avgLng = locs.reduce((sum, l) => sum + l.longitude, 0) / locs.length;
      return [avgLat, avgLng];
    }
    // Дефолт - Улаанбаатар
    return [47.9184, 106.9177];
  }, [serviceLocation, locations]);

  if (!leafletLoaded || isLoading) {
    return (
      <div className={cn("w-full h-[300px] rounded-lg bg-muted flex items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clientLocation = locations.get(clientId);
  const providerLocation = locations.get(providerId);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Карта */}
      <div className="w-full h-[300px] rounded-lg overflow-hidden relative z-0 border">
        <MapContainer
          center={mapCenter}
          zoom={14}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Маркер места услуги */}
          {serviceLocation && icons.service && (
            <>
              <Marker
                position={[serviceLocation.latitude, serviceLocation.longitude]}
                icon={icons.service}
              >
                <Popup>
                  <div className="text-sm font-medium">Место оказания услуги</div>
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
          {clientLocation && icons.client && (
            <Marker
              position={[clientLocation.latitude, clientLocation.longitude]}
              icon={icons.client}
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
          {providerLocation && icons.provider && (
            <Marker
              position={[providerLocation.latitude, providerLocation.longitude]}
              icon={icons.provider}
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
        </MapContainer>
      </div>

      {/* Легенда и управление */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Захиалагч</span>
            {clientLocation && (
              <span className="text-green-500">онлайн</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Үйлчилгээ үзүүлэгч</span>
            {providerLocation && (
              <span className="text-green-500">онлайн</span>
            )}
          </div>
          {serviceLocation && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Үйлчилгээний газар</span>
            </div>
          )}
        </div>

        {/* Кнопка отслеживания (только для активных заявок) */}
        {isActiveJob && (isClient || isProvider) && (
          <div className="flex items-center gap-2">
            {error && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />
                <span>{error}</span>
              </div>
            )}
            {isTracking ? (
              <Button
                size="sm"
                variant="outline"
                onClick={stopTracking}
                className="gap-1.5"
              >
                <Navigation className="h-3.5 w-3.5 text-green-500 animate-pulse" />
                Байршил хуваалцаж байна
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={startTracking}
                className="gap-1.5"
              >
                <Locate className="h-3.5 w-3.5" />
                Байршил хуваалцах
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Хелпер для сообщений об ошибках геолокации
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
