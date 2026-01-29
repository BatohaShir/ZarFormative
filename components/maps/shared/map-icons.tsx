"use client";

import L from "leaflet";

// ============================================
// SHARED MAP MARKER ICONS
// Consolidated from 9 map component files
// ============================================

// Cache for icons to avoid recreation
const iconCache = new Map<string, L.DivIcon>();

function getOrCreateIcon(key: string, createFn: () => L.DivIcon): L.DivIcon {
  if (!iconCache.has(key)) {
    iconCache.set(key, createFn());
  }
  return iconCache.get(key)!;
}

// ============================================
// LOCATION PIN ICONS (teardrop shape)
// ============================================

export function createLocationPinIcon(color: string = "#3b82f6"): L.DivIcon {
  return getOrCreateIcon(`pin-${color}`, () =>
    L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    })
  );
}

// Preset pin icons
export const PIN_ICONS = {
  blue: () => createLocationPinIcon("#3b82f6"),
  red: () => createLocationPinIcon("#ef4444"),
  green: () => createLocationPinIcon("#10b981"),
  amber: () => createLocationPinIcon("#f59e0b"),
} as const;

// ============================================
// CIRCLE ICONS (round markers)
// ============================================

export function createCircleIcon(
  color: string = "#3b82f6",
  size: number = 32,
  withPulse: boolean = false
): L.DivIcon {
  const key = `circle-${color}-${size}-${withPulse}`;
  return getOrCreateIcon(key, () =>
    L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px ${hexToRgba(color, 0.5)};
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${withPulse ? `<div style="position: absolute; inset: 0; background: ${hexToRgba(color, 0.3)}; border-radius: 50%; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ""}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  );
}

// ============================================
// USER LOCATION ICON (green with pulse)
// ============================================

export function createUserLocationIcon(): L.DivIcon {
  return getOrCreateIcon("user-location", () =>
    L.divIcon({
      className: "my-location-marker",
      html: `
        <div class="relative">
          <div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
          <div class="absolute inset-0 w-4 h-4 bg-red-500/30 rounded-full animate-ping"></div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })
  );
}

// ============================================
// CLUSTER ICON (for grouped markers)
// ============================================

export function createClusterIcon(count: number): L.DivIcon {
  // Don't cache cluster icons as count varies
  return L.divIcon({
    className: "cluster-marker",
    html: `
      <div class="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
        <span class="text-white text-xs font-bold">${count}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

// ============================================
// ROLE-BASED ICONS (client, provider, service)
// ============================================

export function createClientIcon(): L.DivIcon {
  return getOrCreateIcon("client", () =>
    L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
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
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
  );
}

export function createProviderIcon(): L.DivIcon {
  return getOrCreateIcon("provider", () =>
    L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
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
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
  );
}

export function createServiceIcon(): L.DivIcon {
  return getOrCreateIcon("service", () =>
    L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
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
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
