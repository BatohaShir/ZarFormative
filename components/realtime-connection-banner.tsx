"use client";

import { useState, useEffect } from "react";
import { useRealtimeConnection } from "@/hooks/use-realtime-connection";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Banner that shows when realtime connection is lost
 * with a 2-second debounce to avoid flickering
 */
export function RealtimeConnectionBanner() {
  const { status, isConnected, isReconnecting, reconnect } = useRealtimeConnection();
  const [showBanner, setShowBanner] = useState(false);

  // Debounce showing the banner to avoid flicker on brief disconnects
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (!isConnected && status !== "connecting") {
      // Wait 2 seconds before showing banner
      timeoutId = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
    } else {
      setShowBanner(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
      <span>
        {isReconnecting ? "Дахин холбогдож байна..." : "Интернэт холболт тасарсан"}
      </span>
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
