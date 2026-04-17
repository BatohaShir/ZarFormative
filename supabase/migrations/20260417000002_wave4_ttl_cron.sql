-- ============================================================
-- Wave 4.2: TTL cleanup cron jobs
--
-- Three retention policies, run daily via pg_cron:
--   * notifications           — 90 days
--   * listings_views          — 90 days (dedup window is 24h; older
--                                         rows are useful only for
--                                         coarse analytics, which
--                                         should be aggregated
--                                         separately if needed)
--   * request_locations       — 30 days after the parent request
--                                 reached a terminal state (completed,
--                                 cancelled_by_*, disputed)
--
-- Idempotent: drop old jobs first so re-running won't duplicate them.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- 1. Notifications retention (90 days)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted int;
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_notifications IS
  'Deletes notifications older than 90 days. Scheduled via pg_cron daily at 03:00 UTC.';

-- ============================================================
-- 2. listings_views retention (90 days)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_listing_views()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted int;
BEGIN
  DELETE FROM listings_views
  WHERE viewed_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_listing_views IS
  'Deletes listings_views rows older than 90 days. Dedup window is 24h so
   older rows only matter for analytics; those should be aggregated
   separately. Scheduled via pg_cron daily at 03:15 UTC.';

-- ============================================================
-- 3. request_locations retention (30 days post-completion)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_request_locations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted int;
BEGIN
  DELETE FROM request_locations rl
  USING listing_requests lr
  WHERE rl.request_id = lr.id
    AND lr.status IN (
      'completed',
      'cancelled_by_client',
      'cancelled_by_provider',
      'disputed'
    )
    AND lr.updated_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_request_locations IS
  'Deletes GPS tracks for requests that reached a terminal state more
   than 30 days ago. Active requests are untouched. Scheduled via
   pg_cron daily at 03:30 UTC.';

-- ============================================================
-- 4. Schedule via pg_cron
-- ============================================================

-- Unschedule any previous versions so we do not pile up duplicates.
DO $$
DECLARE
  job_name text;
BEGIN
  FOR job_name IN
    SELECT jobname FROM cron.job
    WHERE jobname IN (
      'cleanup-old-notifications',
      'cleanup-old-listing-views',
      'cleanup-old-request-locations'
    )
  LOOP
    PERFORM cron.unschedule(job_name);
  END LOOP;
END $$;

SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',
  $$SELECT cleanup_old_notifications()$$
);

SELECT cron.schedule(
  'cleanup-old-listing-views',
  '15 3 * * *',
  $$SELECT cleanup_old_listing_views()$$
);

SELECT cron.schedule(
  'cleanup-old-request-locations',
  '30 3 * * *',
  $$SELECT cleanup_old_request_locations()$$
);

COMMIT;
