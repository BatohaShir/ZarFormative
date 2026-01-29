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
export {
  FullscreenMapModal,
  LegendItem,
  PreviewMapWrapper,
} from "./fullscreen-map-modal";

// Re-export base map constants
export {
  TILE_URL,
  TILE_URLS,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  BaseMap,
  useMapTileUrl,
} from "@/components/ui/base-map";
