import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/**
 * Standardized dynamic import utilities
 * Provides consistent loading states and SSR handling across the codebase
 */

// Default loading component
export function DefaultLoadingSpinner({ height = "h-50" }: { height?: string }) {
  return (
    <div className={`w-full ${height} bg-muted/50 flex items-center justify-center rounded-lg`}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Skeleton loading for cards
export function CardLoadingSkeleton() {
  return (
    <div className="w-full h-full bg-muted/50 rounded-lg animate-pulse" />
  );
}

// Map loading placeholder
export function MapLoadingPlaceholder({ height = "200px" }: { height?: string }) {
  return (
    <div
      className="w-full bg-muted/50 rounded-lg animate-pulse flex items-center justify-center"
      style={{ height }}
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Helper type for dynamic imports
 * Use when the module exports a named component (not default)
 */
type ModuleWithNamedExport<T> = { [key: string]: T };

/**
 * Create a standardized dynamic import for a named export
 *
 * @example
 * const MyComponent = createDynamicImport(
 *   () => import("./my-component"),
 *   "MyComponent"
 * );
 *
 * // With custom loading:
 * const MyComponent = createDynamicImport(
 *   () => import("./my-component"),
 *   "MyComponent",
 *   { loading: () => <CustomLoader /> }
 * );
 */
export function createDynamicImport<T extends React.ComponentType<any>>(
  importFn: () => Promise<ModuleWithNamedExport<T>>,
  componentName: string,
  options: {
    loading?: () => React.ReactNode;
    ssr?: boolean;
  } = {}
) {
  return dynamic(
    () => importFn().then((mod) => ({ default: mod[componentName] as T })),
    {
      ssr: options.ssr ?? false,
      loading: options.loading,
    }
  );
}

/**
 * Create a dynamic import for map components (no SSR, with map loader)
 */
export function createDynamicMapImport<T extends React.ComponentType<any>>(
  importFn: () => Promise<ModuleWithNamedExport<T>>,
  componentName: string,
  height?: string
) {
  return dynamic(
    () => importFn().then((mod) => ({ default: mod[componentName] as T })),
    {
      ssr: false,
      loading: () => <MapLoadingPlaceholder height={height} />,
    }
  );
}

/**
 * Create a dynamic import for modal components (no SSR, no loading)
 */
export function createDynamicModalImport<T extends React.ComponentType<any>>(
  importFn: () => Promise<ModuleWithNamedExport<T>>,
  componentName: string
) {
  return dynamic(
    () => importFn().then((mod) => ({ default: mod[componentName] as T })),
    {
      ssr: false,
    }
  );
}
