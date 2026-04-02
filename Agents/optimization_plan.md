# Optimization Plan

## Audit Summary

- Pages: 20+ pages audited
- DB layer: schema, indexes, queries, caching audited
- Client bundle: components, imports, code-splitting audited

## Priority 1: CSP & Navigation Speed (Critical)

### 1.1 Add missing DB index for schedule queries

- Add composite index `[provider_id, status, preferred_time]` on `listing_requests`

### 1.2 Extract constants from base-map.tsx

- Move `TILE_URL`, `DEFAULT_MAP_CENTER`, `DEFAULT_MAP_ZOOM` to `map-constants.ts`
- Prevents Leaflet from being pulled into SSR if constants are imported

### 1.3 Remove redundant re-exports from services-map-leaflet.tsx

- Remove `getListingsWithCoords` / `ListingWithCoords` re-exports

## Priority 2: Server-Side Rendering for Account Pages (High Impact)

### 2.1 Convert account/me/favorites to server component with client sub-component

### 2.2 Convert account/me/services to server component with client sub-component

### 2.3 Convert account/me/requests to server component with client sub-component

### 2.4 Convert account/me/stats to server component with client sub-component

## Priority 3: Code-Splitting & Bundle Size (Medium Impact)

### 3.1 Dynamic import large modals (request-detail-modal: 1135 lines)

### 3.2 Break down largest client components where possible

### 3.3 Ensure all Leaflet map wrappers use dynamic imports consistently

## Priority 4: DB & API Optimization (Medium Impact)

### 4.1 Fix N+1 in cleanup-orphaned-files cron (use DISTINCT raw SQL)

### 4.2 Parallelize nested storage API loops in cleanup cron

### 4.3 Add caching headers to more API routes where appropriate

## Priority 5: Asset Optimization (Low Impact)

### 5.1 Convert PNG icons to WebP

### 5.2 Add bundle analyzer config

## Execution Order

Step 1: Priorities 1-3 (page speed, SSR, code-splitting)
Step 2: Priority 4 (DB/API)
Step 3: Priority 5 (assets)
