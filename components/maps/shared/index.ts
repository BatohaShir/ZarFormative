// ============================================
// SHARED MAP COMPONENTS INDEX
// Re-exports all shared map utilities
// ============================================

// Map Controls
export {
  MapControlButton,
  MapControlButtonSmall,
  ZoomControls,
  MyLocationButton,
  CenterButton,
  FullscreenButton,
  CloseButton,
  MapControlsContainer,
} from "./map-controls";

// Map Icons
export {
  createLocationPinIcon,
  createCircleIcon,
  createUserLocationIcon,
  createClusterIcon,
  createClientIcon,
  createProviderIcon,
  createServiceIcon,
  PIN_ICONS,
} from "./map-icons";

// Map Controllers
export {
  MapViewController,
  FlyToController,
  MapBoundsController,
  MapClickHandler,
  MapResizeHandler,
  useGeolocation,
  useAutoHideError,
} from "./map-controllers";

// Fullscreen Modal
export { FullscreenMapModal, LegendItem, PreviewMapWrapper } from "./fullscreen-map-modal";

// Re-export map constants (SSR-safe, no Leaflet dependency)
export { TILE_URL, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/components/map-constants";

// Re-export base map component (requires Leaflet, client-only)
export { BaseMap, useMapTileUrl } from "@/components/ui/base-map";
