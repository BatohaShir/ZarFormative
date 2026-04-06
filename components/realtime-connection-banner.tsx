"use client";

import { useState, useEffect } from "react";
import { useRealtimeConnection } from "@/hooks/use-realtime-connection";
import { useAuth } from "@/contexts/auth-context";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Inner banner component — only rendered for authenticated users.
 * This avoids creating a WebSocket connection for guest visitors.
 */
function RealtimeConnectionBannerInner() {
  const { status, isConnected, isReconnecting, reconnect } = useRealtimeConnection();
  const [showBanner, setShowBanner] = useState(false);

  // Debounce: show banner after 2s of disconnect, hide immediately on reconnect
  useEffect(() => {
    if (!isConnected && status !== "connecting") {
      const timeoutId = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timeoutId);
    }
    // Connected or connecting — schedule hide on microtask to avoid sync setState in effect
    const id = requestAnimationFrame(() => setShowBanner(false));
    return () => cancelAnimationFrame(id);
  }, [isConnected, status]);

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-2",
        "bg-amber-500 dark:bg-amber-600 text-white",
        "flex items-center justify-center gap-3 text-sm font-medium",
        "shadow-lg animate-in slide-in-from-top duration-300"
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>{isReconnecting ? "Дахин холбогдож байна..." : "Интернэт холболт тасарсан"}</span>
      {!isReconnecting && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-white hover:bg-white/20 hover:text-white"
          onClick={reconnect}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Дахин оролдох
        </Button>
      )}
      {isReconnecting && <Loader2 className="h-4 w-4 animate-spin" />}
    </div>
  );
}

/**
 * Banner that shows when realtime connection is lost.
 * Only renders for authenticated users to avoid creating
 * unnecessary WebSocket connections for guest visitors.
 */
export function RealtimeConnectionBanner() {
  const { isAuthenticated } = useAuth();

  // Don't create WebSocket for guests
  if (!isAuthenticated) return null;

  return <RealtimeConnectionBannerInner />;
}
