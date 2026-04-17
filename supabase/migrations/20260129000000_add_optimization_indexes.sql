-- Migration: Add performance optimization indexes
-- Created: 2026-01-29
-- Description: Add composite indexes for query optimization as identified in system audit
-- Reference: OPTIMIZATION_ROADMAP.md Phase 1

-- ==============================================
-- LISTINGS TABLE INDEXES
-- ==============================================

-- 1.2 Index for user profile page queries
-- Optimizes: SELECT * FROM listings WHERE user_id = ? AND status = 'active' AND is_active = true
CREATE INDEX IF NOT EXISTS listings_user_id_status_is_active_idx
ON listings(user_id, status, is_active);

-- 1.3 Index for sorting by popularity (views)
-- Optimizes: SELECT * FROM listings WHERE status = 'active' AND is_active = true ORDER BY views_count DESC
CREATE INDEX IF NOT EXISTS listings_status_is_active_views_count_idx
ON listings(status, is_active, views_count DESC);

-- 1.4 Index for price range filtering
-- Optimizes: SELECT * FROM listings WHERE status = 'active' AND is_active = true AND price BETWEEN ? AND ?
CREATE INDEX IF NOT EXISTS listings_status_is_active_price_idx
ON listings(status, is_active, price);

-- Combined index for main listing queries (status + active + created_at)
-- Optimizes: SELECT * FROM listings WHERE status = 'active' AND is_active = true ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS listings_status_is_active_created_at_idx
ON listings(status, is_active, created_at DESC);

-- ==============================================
-- LISTINGS_VIEWS TABLE INDEXES
-- For view tracking deduplication (24-hour window)
-- ==============================================

-- 1.1 Index for recent views lookup by listing
-- Optimizes: SELECT * FROM listings_views WHERE listing_id = ? AND viewed_at >= NOW() - INTERVAL '24 hours'
CREATE INDEX IF NOT EXISTS listings_views_listing_id_viewed_at_idx
ON listings_views(listing_id, viewed_at DESC);

-- Index for deduplication check for authenticated users
-- Optimizes: SELECT * FROM listings_views WHERE listing_id = ? AND viewer_id = ? AND viewed_at >= ?
CREATE INDEX IF NOT EXISTS listings_views_listing_id_viewer_id_viewed_at_idx
ON listings_views(listing_id, viewer_id, viewed_at DESC);

-- Index for deduplication check for anonymous users (by IP)
-- Optimizes: SELECT * FROM listings_views WHERE listing_id = ? AND ip_address = ? AND viewer_id IS NULL AND viewed_at >= ?
CREATE INDEX IF NOT EXISTS listings_views_listing_id_ip_address_viewed_at_idx
ON listings_views(listing_id, ip_address, viewed_at DESC)
WHERE viewer_id IS NULL;

-- ==============================================
-- LISTING_REQUESTS TABLE INDEXES
-- For request queries optimization
-- ==============================================

-- Index for client's requests lookup
-- Optimizes: SELECT * FROM listing_requests WHERE client_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS listing_requests_client_id_created_at_idx
ON listing_requests(client_id, created_at DESC);

-- Index for provider's requests lookup
-- Optimizes: SELECT * FROM listing_requests WHERE provider_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS listing_requests_provider_id_created_at_idx
ON listing_requests(provider_id, created_at DESC);

-- Index for status filtering with user
-- Optimizes: SELECT * FROM listing_requests WHERE client_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS listing_requests_client_id_status_idx
ON listing_requests(client_id, status);

CREATE INDEX IF NOT EXISTS listing_requests_provider_id_status_idx
ON listing_requests(provider_id, status);

-- ==============================================
-- USER_FAVORITES TABLE INDEXES
-- ==============================================

-- Index for user's favorites lookup
-- Optimizes: SELECT * FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS user_favorites_user_id_created_at_idx
ON user_favorites(user_id, created_at DESC);

-- ==============================================
-- CHAT_MESSAGES TABLE INDEXES
-- ==============================================

-- Index for conversation messages
-- Optimizes: SELECT * FROM chat_messages WHERE request_id = ? ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS chat_messages_request_id_created_at_idx
ON chat_messages(request_id, created_at ASC);

-- Index for unread messages count
-- Optimizes: SELECT COUNT(*) FROM chat_messages WHERE request_id = ? AND sender_id != ? AND is_read = false
CREATE INDEX IF NOT EXISTS chat_messages_request_id_sender_id_is_read_idx
ON chat_messages(request_id, sender_id, is_read)
WHERE is_read = false;

-- ==============================================
-- REVIEWS TABLE INDEXES
-- ==============================================

-- Reviews are linked via request_id, not listing_id
-- Index for provider reviews (already created via Prisma)
CREATE INDEX IF NOT EXISTS reviews_provider_id_created_at_idx
ON reviews(provider_id, created_at DESC);

-- Index for client reviews lookup
CREATE INDEX IF NOT EXISTS reviews_client_id_created_at_idx
ON reviews(client_id, created_at DESC);

-- ==============================================
-- COMMENTS
-- ==============================================

-- These indexes support:
-- 1. Fast deduplication of views within 24-hour window
-- 2. Efficient sorting by popularity (views_count)
-- 3. Fast price range filtering
-- 4. Quick user profile listings lookup
-- 5. Optimized request queries for both client and provider
-- 6. Fast favorites and messages retrieval

-- Expected improvements:
-- - View tracking: 5-10x faster
-- - Profile listings: 3-5x faster
-- - Popular sort: 2-3x faster
-- - Price filter: 2-3x faster
