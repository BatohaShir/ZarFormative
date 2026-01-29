"use client";

import * as React from "react";
import { Navigation2, Loader2, ZoomIn, ZoomOut, Maximize2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// SHARED MAP CONTROL BUTTONS
// Consolidated from 9 map component files
// ============================================

interface MapControlButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function MapControlButton({
  onClick,
  disabled,
  title,
  className,
  children,
}: MapControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors border",
        "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700",
        "border-gray-200 dark:border-gray-600",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      title={title}
    >
      {children}
    </button>
  );
}

// Smaller version for inline maps
export function MapControlButtonSmall({
  onClick,
  disabled,
  title,
  className,
  children,
}: MapControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-9 h-9 rounded-lg shadow-md flex items-center justify-center transition-colors border",
        "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700",
        "border-gray-200 dark:border-gray-600",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      title={title}
    >
      {children}
    </button>
  );
}

// ============================================
// ZOOM CONTROLS
// ============================================

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  small?: boolean;
}

export function ZoomControls({ onZoomIn, onZoomOut, small }: ZoomControlsProps) {
  const Button = small ? MapControlButtonSmall : MapControlButton;
  const iconSize = small ? "h-4 w-4" : "h-5 w-5";

  return (
    <>
      <Button onClick={onZoomIn} title="Томруулах">
        <ZoomIn className={cn(iconSize, "text-gray-700 dark:text-gray-300")} />
      </Button>
      <Button onClick={onZoomOut} title="Жижигрүүлэх">
        <ZoomOut className={cn(iconSize, "text-gray-700 dark:text-gray-300")} />
      </Button>
    </>
  );
}

// ============================================
// MY LOCATION BUTTON
// ============================================

interface MyLocationButtonProps {
  onClick: () => void;
  isLocating: boolean;
  hasLocation: boolean;
  small?: boolean;
}

export function MyLocationButton({
  onClick,
  isLocating,
  hasLocation,
  small,
}: MyLocationButtonProps) {
  const Button = small ? MapControlButtonSmall : MapControlButton;
  const iconSize = small ? "h-4 w-4" : "h-5 w-5";

  return (
    <Button
      onClick={onClick}
      disabled={isLocating}
      title="Миний байршил"
      className={cn(
        hasLocation && "bg-green-500 hover:bg-green-600 border-green-600"
      )}
    >
      {isLocating ? (
        <Loader2
          className={cn(
            iconSize,
            "animate-spin",
            hasLocation ? "text-white" : "text-gray-700 dark:text-gray-300"
          )}
        />
      ) : (
        <Navigation2
          className={cn(
            iconSize,
            "rotate-45",
            hasLocation ? "text-white" : "text-gray-700 dark:text-gray-300"
          )}
        />
      )}
    </Button>
  );
}

// ============================================
// CENTER ON MARKER BUTTON
// ============================================

interface CenterButtonProps {
  onClick: () => void;
  small?: boolean;
}

export function CenterButton({ onClick, small }: CenterButtonProps) {
  const Button = small ? MapControlButtonSmall : MapControlButton;
  const iconSize = small ? "h-4 w-4" : "h-5 w-5";

  return (
    <Button onClick={onClick} title="Байршилд төвлөрөх">
      <MapPin className={cn(iconSize, "text-gray-700 dark:text-gray-300")} />
    </Button>
  );
}

// ============================================
// FULLSCREEN BUTTON
// ============================================

interface FullscreenButtonProps {
  onClick: () => void;
  small?: boolean;
}

export function FullscreenButton({ onClick, small }: FullscreenButtonProps) {
  const Button = small ? MapControlButtonSmall : MapControlButton;
  const iconSize = small ? "h-4 w-4" : "h-5 w-5";

  return (
    <Button onClick={onClick} title="Томруулах">
      <Maximize2 className={cn(iconSize, "text-gray-700 dark:text-gray-300")} />
    </Button>
  );
}

// ============================================
// CLOSE BUTTON (for modals)
// ============================================

interface CloseButtonProps {
  onClick: () => void;
  variant?: "overlay" | "header";
}

export function CloseButton({ onClick, variant = "overlay" }: CloseButtonProps) {
  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors shrink-0"
      >
        <X className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
    >
      <X className="h-5 w-5 text-white" />
    </button>
  );
}

// ============================================
// CONTROL GROUP CONTAINER
// ============================================

interface MapControlsContainerProps {
  children: React.ReactNode;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  offsetTop?: boolean; // For fullscreen modals with headers
}

export function MapControlsContainer({
  children,
  position = "top-right",
  offsetTop,
}: MapControlsContainerProps) {
  const positionClasses = {
    "top-right": "top-3 right-3",
    "top-left": "top-3 left-3",
    "bottom-right": "bottom-3 right-3",
    "bottom-left": "bottom-3 left-3",
  };

  return (
    <div
      className={cn(
        "absolute z-[1000] flex flex-col gap-1.5",
        positionClasses[position],
        offsetTop && "top-20"
      )}
    >
      {children}
    </div>
  );
}
