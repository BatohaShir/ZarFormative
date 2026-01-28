"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Loader2, Navigation2, AlertCircle } from "lucide-react";
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

  const watchIdRef = React.useRef<number | null>(null);
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
            <span>Гүйцэтгэгч</span>
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

        {/* Кнопка отслеживания */}
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
                className="gap-1.5 border-green-500 text-green-600 hover:bg-green-50"
              >
                <Navigation2 className="h-3.5 w-3.5 rotate-45 text-green-500 animate-pulse" />
                Хуваалцаж байна
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={startTracking}
                className="gap-1.5 bg-green-500 hover:bg-green-600"
              >
                <Navigation2 className="h-3.5 w-3.5 rotate-45" />
                Байршил хуваалцах
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
