# Realtime Subscriptions Architecture

## Overview

The application uses Supabase Realtime for live updates. This document describes the subscription architecture, limits, and optimization strategies.

## Active Subscriptions

| Hook                    | Channel                         | Table               | Filter                      | Per User    |
| ----------------------- | ------------------------------- | ------------------- | --------------------------- | ----------- |
| `useRealtimeListings`   | `listings-changes`              | `listings`          | `status=eq.active`          | Shared      |
| `useRealtimeRequests`   | `requests-client:{userId}`      | `listing_requests`  | `client_id=eq.{userId}`     | Yes         |
| `useRealtimeRequests`   | `requests-provider:{userId}`    | `listing_requests`  | `provider_id=eq.{userId}`   | Yes         |
| `useRealtimeFavorites`  | `favorites:{userId}`            | `favorites`         | `user_id=eq.{userId}`       | Yes         |
| `useRealtimeMyListings` | `my-listings:{userId}`          | `listings`          | `user_id=eq.{userId}`       | Yes         |
| `useRealtimeViews`      | `listing-views:{listingId}`     | `listings`          | `id=eq.{listingId}`         | Per listing |
| `useRealtimeConnection` | `connection-status`             | N/A                 | N/A                         | Shared      |
| `useRealtimeLocation`   | `request_locations:{requestId}` | `request_locations` | `request_id=eq.{requestId}` | Per request |

## Maximum Subscriptions Per User

**Typical authenticated user:** 5-6 subscriptions

- 1x listings (shared)
- 2x requests (client + provider)
- 1x favorites
- 1x my-listings
- 1x connection status

**On service detail page:** +1-2 subscriptions

- 1x views count (per listing)
- 1x location tracking (if live tracking active)

**Supabase Limits:**

- Free tier: 200 concurrent connections per project
- Pro tier: 500+ concurrent connections
- Each browser tab = 1 connection (multiplexed channels)

## Optimization Strategies

### 1. Channel Multiplexing

All subscriptions share a single WebSocket connection. Multiple channels are multiplexed over this connection.

### 2. Deduplication

Each hook maintains a `processedEventsRef` Set to prevent duplicate event processing:

```typescript
const eventKey = `${eventType}-${id}-${timestamp}`;
if (processedEventsRef.current.has(eventKey)) return;
processedEventsRef.current.add(eventKey);
```

The Set is cleared every 30 seconds to prevent memory growth.

### 3. Automatic Retry

Using exponential backoff with jitter:

```typescript
delay = min((baseDelay * 2) ^ (attempt - 1 + random(0 - 1000)), maxDelay);
```

Default config:

- `maxRetries`: 5
- `baseDelay`: 1000ms
- `maxDelay`: 30000ms

### 4. Efficient Cache Updates

- Use `setQueryData` for field-level updates (views, favorites count)
- Use `invalidateQueries` only when structure changes (INSERT/DELETE)

### 5. Ref-based Dependencies

Callbacks are stored in refs to prevent unnecessary resubscriptions:

```typescript
const queryClientRef = useRef(queryClient);
queryClientRef.current = queryClient;
// useEffect dependencies stay stable
```

## Monitoring

### Connection Status

Check if realtime is working:

```typescript
const { isConnected } = useRealtimeRequests();
if (!isConnected) {
  // Show reconnection indicator
}
```

### Debug Logging

Enable in development:

```typescript
// In lib/realtime-utils.ts
console.log(`[Realtime] Subscribed to ${channelName}`);
console.error(`[Realtime] ${channelName} error:`, err);
```

### Supabase Dashboard

Monitor active connections:

1. Go to Supabase Dashboard → Realtime
2. Check "Active Connections" graph
3. Monitor "Messages sent" for traffic

## Required Database Configuration

For realtime to work, tables must have:

1. **Replica Identity**: Set to FULL for UPDATE events

```sql
ALTER TABLE listings REPLICA IDENTITY FULL;
ALTER TABLE listing_requests REPLICA IDENTITY FULL;
ALTER TABLE favorites REPLICA IDENTITY FULL;
ALTER TABLE request_locations REPLICA IDENTITY FULL;
```

2. **Realtime enabled**: In Supabase Dashboard or via migration

```sql
-- Enable realtime for tables
ALTER publication supabase_realtime ADD TABLE listings;
ALTER publication supabase_realtime ADD TABLE listing_requests;
ALTER publication supabase_realtime ADD TABLE favorites;
ALTER publication supabase_realtime ADD TABLE request_locations;
```

See: `supabase/migrations/20260128_enable_realtime.sql`

## Troubleshooting

### Subscription not receiving events

1. Check REPLICA IDENTITY is set to FULL
2. Check table is in supabase_realtime publication
3. Check RLS policies allow SELECT for the user
4. Check filter matches the data being changed

### Too many connections

1. Ensure subscriptions are properly cleaned up in useEffect return
2. Check for component remounting issues (StrictMode double-mount)
3. Consider reducing subscriptions per user

### Events duplicated

1. Verify deduplication is working (check processedEventsRef)
2. Check if multiple instances of the hook are mounted
3. Verify useEffect cleanup is running

## Future Improvements

1. **Subscription Pooling**: Merge similar subscriptions when possible
2. **Lazy Subscriptions**: Only subscribe when component is visible
3. **Offline Queue**: Queue events when offline, apply on reconnect
4. **Compression**: Enable message compression for large payloads
