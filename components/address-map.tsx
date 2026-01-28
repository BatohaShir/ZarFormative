"use client";

import * as React from "react";
import dynamic from "next/dynamic";

// Fallback координаты (используются если в БД нет координат)
const AIMAG_COORDINATES: Record<string, [number, number]> = {
  "Улаанбаатар": [47.9184, 106.9177],
  "Архангай": [47.8864, 101.4500],
  "Баян-Өлгий": [48.9682, 89.6629],
  "Баянхонгор": [46.1940, 100.7181],
  "Булган": [48.8125, 103.5347],
  "Говь-Алтай": [46.3722, 96.2583],
  "Говьсүмбэр": [46.4756, 108.3572],
  "Дархан-Уул": [49.4685, 105.9550],
  "Дорноговь": [44.8926, 110.1278],
  "Дорнод": [47.7356, 114.5364],
  "Дундговь": [45.7626, 106.2644],
  "Завхан": [48.2369, 96.0703],
  "Орхон": [49.0278, 104.0436],
  "Өвөрхангай": [46.2639, 102.7831],
  "Өмнөговь": [43.5667, 104.4167],
  "Сүхбаатар": [46.6875, 113.3819],
  "Сэлэнгэ": [49.4347, 106.1847],
  "Төв": [47.0681, 106.3531],
  "Увс": [49.9811, 92.0678],
  "Ховд": [48.0056, 91.6417],
  "Хөвсгөл": [49.6347, 100.1631],
  "Хэнтий": [47.3167, 110.6500],
};

const DISTRICT_COORDINATES: Record<string, [number, number]> = {
  "Баянгол": [47.9077, 106.8694],
  "Баянзүрх": [47.9350, 107.0450],
  "Сүхбаатар дүүрэг": [47.9184, 106.9200],
  "Чингэлтэй": [47.9270, 106.9050],
  "Хан-Уул": [47.8780, 106.9050],
  "Сонгинохайрхан": [47.9000, 106.7500],
  "Налайх": [47.7470, 107.2600],
  "Багануур": [47.8290, 108.3500],
  "Багахангай": [47.5000, 107.1500],
};

const DEFAULT_COORDINATES: [number, number] = [47.9184, 106.9177];

// Fallback функции для поиска координат по названию
function findDistrictCoordinates(name: string | null | undefined): [number, number] | null {
  if (!name) return null;
  if (DISTRICT_COORDINATES[name]) return DISTRICT_COORDINATES[name];
  const lowerName = name.toLowerCase();
  for (const [key, coords] of Object.entries(DISTRICT_COORDINATES)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return coords;
    }
  }
  return null;
}

function findAimagCoordinates(name: string | null | undefined): [number, number] | null {
  if (!name) return null;
  if (AIMAG_COORDINATES[name]) return AIMAG_COORDINATES[name];
  const lowerName = name.toLowerCase();
  for (const [key, coords] of Object.entries(AIMAG_COORDINATES)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return coords;
    }
  }
  return null;
}

// Типы данных из БД
interface LocationData {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface AddressMapProps {
  // Данные из БД (приоритетные)
  aimag?: LocationData | null;
  district?: LocationData | null;
  khoroo?: LocationData | null;
  // Fallback - названия (для обратной совместимости)
  aimagName?: string | null;
  districtName?: string | null;
  khorooName?: string | null;
  className?: string;
}

// Динамический импорт карты (без SSR)
const MapComponent = dynamic(
  () => import("./address-map-leaflet").then((mod) => mod.AddressMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted/50 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Газрын зураг ачааллаж байна...</span>
      </div>
    ),
  }
);

export function AddressMap({
  aimag,
  district,
  khoroo,
  aimagName,
  districtName,
  khorooName,
  className,
}: AddressMapProps) {
  // Определяем координаты - приоритет из БД, затем fallback
  const coordinates = React.useMemo((): [number, number] => {
    // 1. Координаты хороо из БД
    if (khoroo?.latitude && khoroo?.longitude) {
      return [khoroo.latitude, khoroo.longitude];
    }

    // 2. Координаты дүүрэга из БД
    if (district?.latitude && district?.longitude) {
      return [district.latitude, district.longitude];
    }

    // 3. Координаты аймага из БД
    if (aimag?.latitude && aimag?.longitude) {
      return [aimag.latitude, aimag.longitude];
    }

    // 4. Fallback по названиям
    const effectiveDistrictName = district?.name || districtName;
    const effectiveAimagName = aimag?.name || aimagName;

    const districtCoords = findDistrictCoordinates(effectiveDistrictName);
    if (districtCoords) return districtCoords;

    const aimagCoords = findAimagCoordinates(effectiveAimagName);
    if (aimagCoords) return aimagCoords;

    // 5. Дефолт - центр УБ
    return DEFAULT_COORDINATES;
  }, [aimag, district, khoroo, aimagName, districtName]);

  // Радиус круга зависит от уровня детализации
  const effectiveKhorooName = khoroo?.name || khorooName;
  const effectiveDistrictName = district?.name || districtName;

  const radius = React.useMemo(() => {
    if (effectiveKhorooName) return 500; // Хороо - 500м
    if (effectiveDistrictName) return 2000; // Район - 2км
    return 5000; // Аймаг - 5км
  }, [effectiveDistrictName, effectiveKhorooName]);

  // Формируем текст адреса
  const addressText = React.useMemo(() => {
    const parts = [
      aimag?.name || aimagName,
      district?.name || districtName,
      khoroo?.name || khorooName,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }, [aimag, district, khoroo, aimagName, districtName, khorooName]);

  return (
    <MapComponent
      coordinates={coordinates}
      radius={radius}
      className={className}
      addressText={addressText}
    />
  );
}
