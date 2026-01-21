"use client";

import * as React from "react";
import dynamic from "next/dynamic";

// Координаты районов Улаанбаатара (примерные центры)
const DISTRICT_COORDINATES: Record<string, [number, number]> = {
  // Улаанбаатар - районы (ключи без "дүүрэг" для поиска)
  "Баянгол": [47.9077, 106.8694],
  "Баянзүрх": [47.9350, 107.0450],
  "Сүхбаатар": [47.9184, 106.9200],
  "Чингэлтэй": [47.9270, 106.9050],
  "Хан-Уул": [47.8780, 106.9050],
  "Сонгинохайрхан": [47.9000, 106.7500],
  "Налайх": [47.7470, 107.2600],
  "Багануур": [47.8290, 108.3500],
  "Багахангай": [47.5000, 107.1500],
  // Дефолтные координаты для Улаанбаатара
  "Улаанбаатар": [47.9184, 106.9177],
};

// Дефолтные координаты для центра Монголии
const DEFAULT_COORDINATES: [number, number] = [47.9184, 106.9177];

// Функция для поиска координат по названию (с частичным совпадением)
function findCoordinates(name: string | null | undefined): [number, number] | null {
  if (!name) return null;

  // Сначала точное совпадение
  if (DISTRICT_COORDINATES[name]) {
    return DISTRICT_COORDINATES[name];
  }

  // Затем поиск по вхождению (например "Багануур дүүрэг" содержит "Багануур")
  const lowerName = name.toLowerCase();
  for (const [key, coords] of Object.entries(DISTRICT_COORDINATES)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return coords;
    }
  }

  return null;
}

interface AddressMapProps {
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
  aimagName,
  districtName,
  khorooName,
  className,
}: AddressMapProps) {
  // Определяем координаты на основе адреса
  const coordinates = React.useMemo(() => {
    // Сначала пробуем найти район
    const districtCoords = findCoordinates(districtName);
    if (districtCoords) return districtCoords;

    // Затем аймаг
    const aimagCoords = findCoordinates(aimagName);
    if (aimagCoords) return aimagCoords;

    // Дефолт - центр УБ
    return DEFAULT_COORDINATES;
  }, [aimagName, districtName]);

  // Радиус круга зависит от уровня детализации
  const radius = React.useMemo(() => {
    if (khorooName) return 500; // Хороо - 500м
    if (districtName) return 2000; // Район - 2км
    return 5000; // Аймаг - 5км
  }, [districtName, khorooName]);

  return (
    <MapComponent
      coordinates={coordinates}
      radius={radius}
      className={className}
    />
  );
}
