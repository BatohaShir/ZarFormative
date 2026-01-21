"use client";

import * as React from "react";
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

interface AddressMapLeafletProps {
  coordinates: [number, number];
  radius: number;
  className?: string;
}

export function AddressMapLeaflet({
  coordinates,
  radius,
  className,
}: AddressMapLeafletProps) {
  return (
    <div className={cn("w-full h-[200px] rounded-lg overflow-hidden relative z-0", className)}>
      <MapContainer
        center={coordinates}
        zoom={radius > 2000 ? 12 : 14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={coordinates}
          radius={radius}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.2,
            weight: 2,
          }}
        />
      </MapContainer>
    </div>
  );
}
