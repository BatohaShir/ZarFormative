-- ============================================================
-- Boost lifecycle: expire + cleanup + duplicate guard
--
-- Until now nothing actually drove listing_boosts.status from
-- 'active' to 'expired' — every read used
-- `status='active' AND expires_at > NOW()` so the enum slot was
-- cosmetic and rows piled up forever. And the ZenStack create
-- policy happily accepted a second active boost on the same
-- listing, so pressing "Buy VIP" twice doubled rows instead of
-- extending.
--
-- Two fixes land here, both DB-level so no client code can bypass:
--   1. pg_cron hourly job that flips expired rows to status='expired'
--      and deletes rows whose expired state is > 90 days old. Hourly
--      because boosts are bought in 3/7/14-day granularity and an
--      hour of "VIP still on the card after it should be gone" is
--      fine; more often is pointless.
--   2. Partial unique index that lets at most one row per listing
--      carry status='active'. A second INSERT (or an UPDATE that
--      flips status back) raises 23505 / unique_violation — which
--      the client can surface as "you already have an active VIP".
--
-- Idempotent: functions use CREATE OR REPLACE, cron jobs are
-- unscheduled first, and the unique index is conditional.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ------------------------------------------------------------
-- 1. Expire + cleanup function
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_and_prune_boosts()
RETURNS TABLE(expired int, pruned int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired int;
  v_pruned  int;
BEGIN
  -- Flip newly-expired rows. The partial unique index on
  -- (listing_id) WHERE status='active' is intentionally released by
  -- this UPDATE — once the row leaves 'active', the listing is free
  -- to receive a new boost without deleting anything.
  UPDATE listing_boosts
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at <= NOW();
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  -- Keep 90 days of expired history for analytics / refund handling,
  -- then drop. Active rows are untouched.
  DELETE FROM listing_boosts
  WHERE status = 'expired'
    AND expires_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_pruned = ROW_COUNT;

  expired := v_expired;
  pruned  := v_pruned;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION expire_and_prune_boosts IS
  'Flips listing_boosts rows whose expires_at has passed from
   active to expired, then deletes expired rows older than 90
   days. Scheduled hourly via pg_cron.';

-- ------------------------------------------------------------
-- 2. One-shot backfill BEFORE creating the unique index.
--    Two reasons to run this first:
--      * flips already-stale rows out of status='active' so the
--        unique index below doesn't collide with them;
--      * proves the function works in the same transaction as the
--        rest of the migration — if it fails, we roll back clean.
-- ------------------------------------------------------------
SELECT expire_and_prune_boosts();

-- ------------------------------------------------------------
-- 3. Defensive cleanup: if two active boosts somehow sit on the
--    same listing (pre-migration data where create wasn't guarded),
--    keep the one that expires latest and flip the rest to expired.
--    Without this, the unique index creation would fail.
-- ------------------------------------------------------------
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY listing_id
           ORDER BY expires_at DESC, created_at DESC
         ) AS rn
  FROM listing_boosts
  WHERE status = 'active'
)
UPDATE listing_boosts
SET status = 'expired'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ------------------------------------------------------------
-- 4. Partial unique index — one active boost per listing
--
-- A partial index (WHERE status = 'active') means we only pay the
-- uniqueness check on rows that matter. Rows that age out into
-- 'expired' drop out of the index automatically, and a new boost
-- can be inserted against the same listing.
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_boosts_one_active_per_listing
  ON listing_boosts (listing_id)
  WHERE status = 'active';

-- ------------------------------------------------------------
-- 5. Schedule (drop old versions first so re-run doesn't pile up)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-and-prune-boosts') THEN
    PERFORM cron.unschedule('expire-and-prune-boosts');
  END IF;
END $$;

SELECT cron.schedule(
  'expire-and-prune-boosts',
  '0 * * * *',  -- top of every hour, UTC
  $$SELECT expire_and_prune_boosts()$$
);

COMMIT;
