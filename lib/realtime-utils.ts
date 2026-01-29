import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface SubscriptionConfig<T extends Record<string, unknown>> {
  channelName: string;
  table: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 16000,
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function getRetryDelay(attempt: number, config: Required<RetryConfig>): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(2, attempt),
    config.maxDelay
  );
  // Add jitter (±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(exponentialDelay + jitter);
}

/**
 * Create a realtime subscription with automatic retry logic
 */
export function createRealtimeSubscription<T extends Record<string, unknown>>(
  config: SubscriptionConfig<T>,
  retryConfig: RetryConfig = {}
): { unsubscribe: () => void; channel: RealtimeChannel | null } {
  const supabase = createClient();
  const finalRetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

  let channel: RealtimeChannel | null = null;
  let retryCount = 0;
  let retryTimeoutId: NodeJS.Timeout | null = null;
  let isUnsubscribed = false;

  const subscribe = () => {
    if (isUnsubscribed) return;

    const filterConfig = config.filter
      ? { event: config.event || "*", schema: "public" as const, table: config.table, filter: config.filter }
      : { event: config.event || "*", schema: "public" as const, table: config.table };

    const newChannel = supabase.channel(config.channelName);

    newChannel
      .on(
        "postgres_changes",
        filterConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          // Reset retry count on successful message
          retryCount = 0;

          if (payload.eventType === "INSERT" && config.onInsert) {
            config.onInsert(payload);
          } else if (payload.eventType === "UPDATE" && config.onUpdate) {
            config.onUpdate(payload);
          } else if (payload.eventType === "DELETE" && config.onDelete) {
            config.onDelete(payload);
          }

          if (config.onChange) {
            config.onChange(payload);
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Subscribed to ${config.channelName}`);
          retryCount = 0;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[Realtime] ${config.channelName} error:`, err);
          handleRetry();
        } else if (status === "CLOSED") {
          console.log(`[Realtime] ${config.channelName} closed`);
          if (!isUnsubscribed) {
            handleRetry();
          }
        }
      });

    channel = newChannel;
  };

  const handleRetry = () => {
    if (isUnsubscribed || retryCount >= finalRetryConfig.maxRetries) {
      if (retryCount >= finalRetryConfig.maxRetries) {
        console.error(`[Realtime] ${config.channelName}: Max retries (${finalRetryConfig.maxRetries}) reached`);
      }
      return;
    }

    const delay = getRetryDelay(retryCount, finalRetryConfig);
    retryCount++;

    console.log(`[Realtime] ${config.channelName}: Retry ${retryCount}/${finalRetryConfig.maxRetries} in ${delay}ms`);

    retryTimeoutId = setTimeout(() => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      subscribe();
    }, delay);
  };

  const unsubscribe = () => {
    isUnsubscribed = true;

    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }

    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };

  // Start subscription
  subscribe();

  return { unsubscribe, channel };
}
