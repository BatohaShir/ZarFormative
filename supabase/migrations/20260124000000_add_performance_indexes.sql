-- Add performance indexes for common query patterns
-- These indexes improve query performance for filtering and joins

-- Index for listing_requests filtered by preferred_date (used in cron jobs and schedule queries)
CREATE INDEX IF NOT EXISTS idx_listing_requests_preferred_date
ON listing_requests(preferred_date)
WHERE preferred_date IS NOT NULL;

-- Index for listings_views filtered by viewed_at (used for analytics and pagination)
CREATE INDEX IF NOT EXISTS idx_listings_views_viewed_at
ON listings_views(viewed_at DESC);

-- Composite index for notifications (user_id + created_at) for efficient user notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- Index for chat_messages by request_id and created_at (for efficient chat loading)
CREATE INDEX IF NOT EXISTS idx_chat_messages_request_created
ON chat_messages(request_id, created_at DESC);

-- Index for reviews by provider_id (for profile reviews queries)
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id
ON reviews(provider_id);

-- Index for listing_requests by status (used in many filtering queries)
CREATE INDEX IF NOT EXISTS idx_listing_requests_status
ON listing_requests(status);

-- Composite index for listing_requests provider queries
CREATE INDEX IF NOT EXISTS idx_listing_requests_provider_status
ON listing_requests(provider_id, status);

-- Composite index for listing_requests client queries
CREATE INDEX IF NOT EXISTS idx_listing_requests_client_status
ON listing_requests(client_id, status);

-- Index for profiles created_at DESC (for sorting recent profiles)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
ON profiles(created_at DESC);

-- Composite index for categories (is_active + sort_order) for active categories display
CREATE INDEX IF NOT EXISTS idx_categories_active_sort
ON categories(is_active, sort_order)
WHERE is_active = true;

-- Index for listings_images (is_cover + listing_id) for finding cover images efficiently
CREATE INDEX IF NOT EXISTS idx_listings_images_cover
ON listings_images(is_cover, listing_id)
WHERE is_cover = true;
