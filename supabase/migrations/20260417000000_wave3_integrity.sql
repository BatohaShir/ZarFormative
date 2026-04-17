-- ============================================================
-- Wave 3: Data integrity, denormalized counter triggers,
-- uniqueness guarantees, cleanup of legacy index duplicates.
--
-- Applies to the single test database. Idempotent: safe to run
-- multiple times. CHECK constraints use NOT VALID so they fix
-- the future even if existing rows would fail; VALIDATE at the
-- bottom makes them enforced for current data too (raises if
-- anything is wrong so we learn about bad test data).
-- ============================================================

BEGIN;

-- ============================================================
-- 0. CLEANUP: orphan profiles (no matching auth.users row)
--    Required before adding FK profiles.id -> auth.users(id).
--    Preflight audit identified 1 such row (manually-inserted
--    test admin). Delete only orphans with zero references
--    elsewhere — if an orphan has dependencies we raise instead
--    of silently dropping data.
-- ============================================================

DO $$
DECLARE
  bad_id uuid;
  dep_count int;
BEGIN
  FOR bad_id IN
    SELECT p.id FROM profiles p
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
  LOOP
    SELECT
      (SELECT COUNT(*) FROM listings         WHERE user_id     = bad_id)
    + (SELECT COUNT(*) FROM listing_requests WHERE client_id   = bad_id OR provider_id = bad_id)
    + (SELECT COUNT(*) FROM reviews          WHERE client_id   = bad_id OR provider_id = bad_id)
    + (SELECT COUNT(*) FROM chat_messages    WHERE sender_id   = bad_id)
    + (SELECT COUNT(*) FROM user_favorites   WHERE user_id     = bad_id)
    + (SELECT COUNT(*) FROM notifications    WHERE user_id     = bad_id OR actor_id    = bad_id)
    + (SELECT COUNT(*) FROM ad_stories       WHERE user_id     = bad_id)
    + (SELECT COUNT(*) FROM listing_boosts   WHERE user_id     = bad_id)
    + (SELECT COUNT(*) FROM request_locations WHERE user_id    = bad_id)
    + (SELECT COUNT(*) FROM listings_views   WHERE viewer_id   = bad_id)
    INTO dep_count;

    IF dep_count > 0 THEN
      RAISE EXCEPTION 'Orphan profile % has % dependent rows — manual cleanup required', bad_id, dep_count;
    END IF;

    DELETE FROM profiles WHERE id = bad_id;
    RAISE NOTICE 'Deleted orphan profile %', bad_id;
  END LOOP;
END $$;

-- ============================================================
-- 1. CHECK CONSTRAINTS
-- ============================================================

-- reviews.rating must be 1..5
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_rating_range;
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range
  CHECK (rating BETWEEN 1 AND 5) NOT VALID;

-- Money cannot be negative
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_price_nonneg;
ALTER TABLE listings ADD CONSTRAINT listings_price_nonneg
  CHECK (price IS NULL OR price >= 0) NOT VALID;

ALTER TABLE listing_requests DROP CONSTRAINT IF EXISTS listing_requests_proposed_price_nonneg;
ALTER TABLE listing_requests ADD CONSTRAINT listing_requests_proposed_price_nonneg
  CHECK (proposed_price IS NULL OR proposed_price >= 0) NOT VALID;

-- Geo coordinates in valid WGS84 range
ALTER TABLE aimags DROP CONSTRAINT IF EXISTS aimags_coords_range;
ALTER TABLE aimags ADD CONSTRAINT aimags_coords_range
  CHECK (
    (latitude IS NULL OR latitude BETWEEN -90 AND 90)
    AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
  ) NOT VALID;

ALTER TABLE districts DROP CONSTRAINT IF EXISTS districts_coords_range;
ALTER TABLE districts ADD CONSTRAINT districts_coords_range
  CHECK (
    (latitude IS NULL OR latitude BETWEEN -90 AND 90)
    AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
  ) NOT VALID;

ALTER TABLE khoroos DROP CONSTRAINT IF EXISTS khoroos_coords_range;
ALTER TABLE khoroos ADD CONSTRAINT khoroos_coords_range
  CHECK (
    (latitude IS NULL OR latitude BETWEEN -90 AND 90)
    AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
  ) NOT VALID;

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_coords_range;
ALTER TABLE listings ADD CONSTRAINT listings_coords_range
  CHECK (
    (latitude IS NULL OR latitude BETWEEN -90 AND 90)
    AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
  ) NOT VALID;

ALTER TABLE listing_requests DROP CONSTRAINT IF EXISTS listing_requests_coords_range;
ALTER TABLE listing_requests ADD CONSTRAINT listing_requests_coords_range
  CHECK (
    (latitude IS NULL OR latitude BETWEEN -90 AND 90)
    AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
  ) NOT VALID;

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_coords_range;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_coords_range
  CHECK (
    (location_lat IS NULL OR location_lat BETWEEN -90 AND 90)
    AND (location_lng IS NULL OR location_lng BETWEEN -180 AND 180)
  ) NOT VALID;

ALTER TABLE request_locations DROP CONSTRAINT IF EXISTS request_locations_coords_range;
ALTER TABLE request_locations ADD CONSTRAINT request_locations_coords_range
  CHECK (
    latitude BETWEEN -90 AND 90
    AND longitude BETWEEN -180 AND 180
  ) NOT VALID;

-- HH:mm format (00:00..23:59)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_work_hours_format;
ALTER TABLE listings ADD CONSTRAINT listings_work_hours_format
  CHECK (
    (work_hours_start IS NULL OR work_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND (work_hours_end   IS NULL OR work_hours_end   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  ) NOT VALID;

ALTER TABLE profiles_notification_settings DROP CONSTRAINT IF EXISTS pns_quiet_hours_format;
ALTER TABLE profiles_notification_settings ADD CONSTRAINT pns_quiet_hours_format
  CHECK (
    quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND quiet_hours_end   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ) NOT VALID;

ALTER TABLE listing_requests DROP CONSTRAINT IF EXISTS listing_requests_preferred_time_format;
ALTER TABLE listing_requests ADD CONSTRAINT listing_requests_preferred_time_format
  CHECK (preferred_time IS NULL OR preferred_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') NOT VALID;

-- Enum-like string fields
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_preferred_language_valid;
ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_language_valid
  CHECK (preferred_language IN ('mn','ru','en')) NOT VALID;

ALTER TABLE profiles_notification_settings DROP CONSTRAINT IF EXISTS pns_email_digest_freq_valid;
ALTER TABLE profiles_notification_settings ADD CONSTRAINT pns_email_digest_freq_valid
  CHECK (email_digest_frequency IN ('daily','weekly','never')) NOT VALID;

ALTER TABLE ad_stories DROP CONSTRAINT IF EXISTS ad_stories_plan_valid;
ALTER TABLE ad_stories ADD CONSTRAINT ad_stories_plan_valid
  CHECK (plan IN ('1day','2day')) NOT VALID;

ALTER TABLE listing_boosts DROP CONSTRAINT IF EXISTS listing_boosts_plan_valid;
ALTER TABLE listing_boosts ADD CONSTRAINT listing_boosts_plan_valid
  CHECK (plan IN ('3day','7day','14day')) NOT VALID;

-- chat_messages.attachment_type — image/location or null
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_attachment_type_valid;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_attachment_type_valid
  CHECK (attachment_type IS NULL OR attachment_type IN ('image','location')) NOT VALID;

-- Coverage: ad_stories must have a positive views_count
ALTER TABLE ad_stories DROP CONSTRAINT IF EXISTS ad_stories_views_nonneg;
ALTER TABLE ad_stories ADD CONSTRAINT ad_stories_views_nonneg
  CHECK (views_count >= 0) NOT VALID;

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_counts_nonneg;
ALTER TABLE listings ADD CONSTRAINT listings_counts_nonneg
  CHECK (views_count >= 0 AND favorites_count >= 0) NOT VALID;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_counts_nonneg;
ALTER TABLE profiles ADD CONSTRAINT profiles_counts_nonneg
  CHECK (reviews_count >= 0 AND completed_jobs_count >= 0) NOT VALID;

-- ============================================================
-- 2. PARTIAL UNIQUE INDEX — only one active request per
--    (listing, client). Matches RequestStatus values that
--    represent an ongoing workflow.
-- ============================================================

DROP INDEX IF EXISTS uniq_active_request_per_client_listing;
CREATE UNIQUE INDEX uniq_active_request_per_client_listing
  ON listing_requests (listing_id, client_id)
  WHERE status IN (
    'pending',
    'price_proposed',
    'accepted',
    'in_progress',
    'awaiting_client_confirmation',
    'awaiting_completion_details',
    'awaiting_payment'
  );

-- ============================================================
-- 3. FK: profiles.id -> auth.users(id)
--    Guarantees profile cleanup on auth deletion.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_id_fkey' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 4. TRIGGERS: keep denormalized counters in sync
-- ============================================================

-- 4a. profiles.reviews_count + avg_rating
CREATE OR REPLACE FUNCTION recalc_provider_rating(p_provider_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles
  SET
    reviews_count = COALESCE((SELECT COUNT(*) FROM reviews WHERE provider_id = p_provider_id), 0),
    avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE provider_id = p_provider_id)
  WHERE id = p_provider_id;
END;
$$;

CREATE OR REPLACE FUNCTION reviews_counters_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recalc_provider_rating(NEW.provider_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM recalc_provider_rating(NEW.provider_id);
    IF NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
      PERFORM recalc_provider_rating(OLD.provider_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM recalc_provider_rating(OLD.provider_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reviews_counters ON reviews;
CREATE TRIGGER reviews_counters
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION reviews_counters_trigger();

-- 4b. listings.favorites_count
CREATE OR REPLACE FUNCTION favorites_counter_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE listings SET favorites_count = favorites_count + 1 WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE listings SET favorites_count = GREATEST(favorites_count - 1, 0) WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS favorites_counter ON user_favorites;
CREATE TRIGGER favorites_counter
  AFTER INSERT OR DELETE ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION favorites_counter_trigger();

-- 4c. profiles.completed_jobs_count — when request transitions to 'completed'
CREATE OR REPLACE FUNCTION completed_jobs_counter_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Entered completed state
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE profiles
    SET completed_jobs_count = completed_jobs_count + 1
    WHERE id = NEW.provider_id;
  -- Left completed state (e.g. disputed/cancelled)
  ELSIF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    UPDATE profiles
    SET completed_jobs_count = GREATEST(completed_jobs_count - 1, 0)
    WHERE id = OLD.provider_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS completed_jobs_counter ON listing_requests;
CREATE TRIGGER completed_jobs_counter
  AFTER UPDATE OF status ON listing_requests
  FOR EACH ROW
  EXECUTE FUNCTION completed_jobs_counter_trigger();

-- 4d. listings.published_at — auto-set on status transition to 'active'
CREATE OR REPLACE FUNCTION listings_published_at_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active')
     AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_set_published_at ON listings;
CREATE TRIGGER listings_set_published_at
  BEFORE INSERT OR UPDATE OF status ON listings
  FOR EACH ROW
  EXECUTE FUNCTION listings_published_at_trigger();

-- ============================================================
-- 5. BACKFILL counters so they match trigger invariants
-- ============================================================

UPDATE profiles p
SET
  reviews_count = COALESCE(r.cnt, 0),
  avg_rating = r.avg_rating
FROM (
  SELECT provider_id,
         COUNT(*) AS cnt,
         ROUND(AVG(rating)::numeric, 1) AS avg_rating
  FROM reviews
  GROUP BY provider_id
) r
WHERE p.id = r.provider_id;

-- Profiles with no reviews: zero out (but keep avg_rating NULL)
UPDATE profiles
SET reviews_count = 0, avg_rating = NULL
WHERE id NOT IN (SELECT DISTINCT provider_id FROM reviews);

UPDATE listings l
SET favorites_count = COALESCE(f.cnt, 0)
FROM (
  SELECT listing_id, COUNT(*) AS cnt FROM user_favorites GROUP BY listing_id
) f
WHERE l.id = f.listing_id;

UPDATE listings
SET favorites_count = 0
WHERE id NOT IN (SELECT DISTINCT listing_id FROM user_favorites);

UPDATE profiles p
SET completed_jobs_count = COALESCE(c.cnt, 0)
FROM (
  SELECT provider_id, COUNT(*) AS cnt
  FROM listing_requests
  WHERE status = 'completed'
  GROUP BY provider_id
) c
WHERE p.id = c.provider_id;

UPDATE profiles
SET completed_jobs_count = 0
WHERE id NOT IN (
  SELECT DISTINCT provider_id FROM listing_requests WHERE status = 'completed'
);

-- ============================================================
-- 6. DROP REDUNDANT INDEXES (duplicates identified in audit)
-- ============================================================

-- Duplicates from prisma/migrations/20250124_add_performance_indexes
-- and supabase/migrations/20260129_add_optimization_indexes that mirror
-- indexes already declared in schema.zmodel (and therefore in prisma).
DROP INDEX IF EXISTS idx_listing_requests_preferred_date;   -- duplicate of (status, preferred_date) coverage
DROP INDEX IF EXISTS idx_listings_views_viewed_at;          -- covered by (listing_id, viewed_at)
DROP INDEX IF EXISTS idx_notifications_user_created;        -- duplicate of zmodel composite
DROP INDEX IF EXISTS idx_chat_messages_request_created;     -- duplicate of (request_id, created_at)
DROP INDEX IF EXISTS idx_reviews_provider_id;               -- duplicate of (provider_id, created_at)
DROP INDEX IF EXISTS idx_listing_requests_status;           -- covered by (status, created_at)
DROP INDEX IF EXISTS idx_listing_requests_provider_status;  -- duplicate
DROP INDEX IF EXISTS idx_listing_requests_client_status;    -- duplicate
DROP INDEX IF EXISTS idx_profiles_created_at;               -- duplicate of zmodel (created_at)
DROP INDEX IF EXISTS idx_categories_active_sort;            -- duplicate of (is_active, sort_order)
DROP INDEX IF EXISTS idx_listings_images_cover;             -- duplicate of (listing_id, is_cover)

DROP INDEX IF EXISTS listings_user_id_status_is_active_idx;
DROP INDEX IF EXISTS listings_status_is_active_views_count_idx;
DROP INDEX IF EXISTS listings_status_is_active_price_idx;   -- not in zmodel; price-range is rare, keep cheap
DROP INDEX IF EXISTS listings_status_is_active_created_at_idx;
DROP INDEX IF EXISTS listings_views_listing_id_viewed_at_idx;
DROP INDEX IF EXISTS listings_views_listing_id_viewer_id_viewed_at_idx;
DROP INDEX IF EXISTS listings_views_listing_id_ip_address_viewed_at_idx;
DROP INDEX IF EXISTS listing_requests_client_id_created_at_idx;
DROP INDEX IF EXISTS listing_requests_provider_id_created_at_idx;
DROP INDEX IF EXISTS listing_requests_client_id_status_idx;
DROP INDEX IF EXISTS listing_requests_provider_id_status_idx;
DROP INDEX IF EXISTS user_favorites_user_id_created_at_idx;
DROP INDEX IF EXISTS chat_messages_request_id_created_at_idx;
DROP INDEX IF EXISTS chat_messages_request_id_sender_id_is_read_idx;
DROP INDEX IF EXISTS reviews_provider_id_created_at_idx;
DROP INDEX IF EXISTS reviews_client_id_created_at_idx;

-- ============================================================
-- 7. VALIDATE the CHECK constraints we added NOT VALID.
--    Raises an error if test data violates them — fix the data
--    then re-run. Safe because DB is test-only.
-- ============================================================

ALTER TABLE reviews                        VALIDATE CONSTRAINT reviews_rating_range;
ALTER TABLE listings                       VALIDATE CONSTRAINT listings_price_nonneg;
ALTER TABLE listing_requests               VALIDATE CONSTRAINT listing_requests_proposed_price_nonneg;
ALTER TABLE aimags                         VALIDATE CONSTRAINT aimags_coords_range;
ALTER TABLE districts                      VALIDATE CONSTRAINT districts_coords_range;
ALTER TABLE khoroos                        VALIDATE CONSTRAINT khoroos_coords_range;
ALTER TABLE listings                       VALIDATE CONSTRAINT listings_coords_range;
ALTER TABLE listing_requests               VALIDATE CONSTRAINT listing_requests_coords_range;
ALTER TABLE chat_messages                  VALIDATE CONSTRAINT chat_messages_coords_range;
ALTER TABLE request_locations              VALIDATE CONSTRAINT request_locations_coords_range;
ALTER TABLE listings                       VALIDATE CONSTRAINT listings_work_hours_format;
ALTER TABLE profiles_notification_settings VALIDATE CONSTRAINT pns_quiet_hours_format;
ALTER TABLE listing_requests               VALIDATE CONSTRAINT listing_requests_preferred_time_format;
ALTER TABLE profiles                       VALIDATE CONSTRAINT profiles_preferred_language_valid;
ALTER TABLE profiles_notification_settings VALIDATE CONSTRAINT pns_email_digest_freq_valid;
ALTER TABLE ad_stories                     VALIDATE CONSTRAINT ad_stories_plan_valid;
ALTER TABLE listing_boosts                 VALIDATE CONSTRAINT listing_boosts_plan_valid;
ALTER TABLE chat_messages                  VALIDATE CONSTRAINT chat_messages_attachment_type_valid;
ALTER TABLE ad_stories                     VALIDATE CONSTRAINT ad_stories_views_nonneg;
ALTER TABLE listings                       VALIDATE CONSTRAINT listings_counts_nonneg;
ALTER TABLE profiles                       VALIDATE CONSTRAINT profiles_counts_nonneg;

COMMIT;
