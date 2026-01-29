"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

interface UseRealtimeConnectionOptions {
  /** Auto reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: 5) */
  maxRetries?: number;
  /** Base delay between retries in ms (default: 1000) */
  baseDelay?: number;
}

const DEFAULT_OPTIONS: Required<UseRealtimeConnectionOptions> = {
  autoReconnect: true,
  maxRetries: 5,
  baseDelay: 1000,
};

/**
 * Hook to monitor Supabase Realtime connection status
 * with automatic reconnection support
 */
export function useRealtimeConnection(options: UseRealtimeConnectionOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [retryCount, setRetryCount] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef(createClient());

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    const supabase = supabaseRef.current;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    setStatus("connecting");

    const channel = supabase.channel("connection-monitor", {
      config: { presence: { key: "connection-check" } },
    });

    channel.subscribe((status: string, err?: Error) => {
      if (status === "SUBSCRIBED") {
        setStatus("connected");
        setRetryCount(0);
        clearRetryTimeout();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("[RealtimeConnection] Error:", err);
        setStatus("disconnected");

        if (opts.autoReconnect && retryCount < opts.maxRetries) {
          const delay = opts.baseDelay * Math.pow(2, retryCount);
          setStatus("reconnecting");
          setRetryCount((prev) => prev + 1);

          retryTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      } else if (status === "CLOSED") {
        setStatus("disconnected");
      }
    });

    channelRef.current = channel;
  }, [opts.autoReconnect, opts.maxRetries, opts.baseDelay, retryCount, clearRetryTimeout]);

  const reconnect = useCallback(() => {
    clearRetryTimeout();
    setRetryCount(0);
    connect();
  }, [connect, clearRetryTimeout]);

  useEffect(() => {
    connect();

    return () => {
      clearRetryTimeout();
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    isConnected: status === "connected",
    isReconnecting: status === "reconnecting",
    retryCount,
    reconnect,
  };
}
