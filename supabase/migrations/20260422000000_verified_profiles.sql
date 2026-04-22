-- ============================================================
-- Verified profiles
--
-- Adds a boolean `is_verified` flag to profiles, driven by a
-- configurable threshold on completed_jobs_count. A provider crossing
-- the threshold earns the badge automatically; a rollback of a
-- completed job that pulls them back below the threshold removes it.
-- Kept in sync by extending the existing completed_jobs_counter
-- trigger so the counter and the flag update in a single UPDATE —
-- SELECTs can never observe a (count=20, is_verified=false) skew.
--
-- The threshold itself lives in a new key-value table `app_settings`
-- so product can change it without a migration/redeploy. When
-- recompute is needed (threshold change, manual fix), run the
-- `recompute_is_verified()` function defined below.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. app_settings table — single source of truth for global knobs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the verified threshold. JSONB so future knobs with complex
-- shapes (ranges, per-tier values, etc.) reuse the same table.
INSERT INTO app_settings (key, value)
VALUES ('verified_threshold', '20'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 2. profiles.is_verified — denormalized flag
-- ------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- Partial index — we only ever query "verified users", so a partial
-- index on true is smaller and faster than a full index. Queries
-- filtering `is_verified = false` are not in any hot path.
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified
  ON profiles (is_verified)
  WHERE is_verified = true;

-- ------------------------------------------------------------
-- 3. Helper: read the current threshold (with a safe fallback)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION verified_threshold()
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT (value::text)::int FROM app_settings WHERE key = 'verified_threshold'),
    20
  );
$$;

-- ------------------------------------------------------------
-- 4. Extend completed_jobs_counter_trigger to also maintain the flag
--
-- Both columns move in the same UPDATE so they cannot drift. The
-- threshold is read via verified_threshold() each fire — the function
-- is STABLE and the setting row sits behind a PK lookup, so the
-- overhead per request-completion event is negligible.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION completed_jobs_counter_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  threshold INT := verified_threshold();
BEGIN
  -- Entered completed state
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE profiles
    SET
      completed_jobs_count = completed_jobs_count + 1,
      is_verified          = (completed_jobs_count + 1) >= threshold
    WHERE id = NEW.provider_id;

  -- Left completed state (e.g. disputed/cancelled)
  ELSIF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    UPDATE profiles
    SET
      completed_jobs_count = GREATEST(completed_jobs_count - 1, 0),
      is_verified          = GREATEST(completed_jobs_count - 1, 0) >= threshold
    WHERE id = OLD.provider_id;
  END IF;
  RETURN NEW;
END;
$$;

-- The trigger wiring itself is unchanged (defined in wave3_integrity)
-- so we don't need to DROP/CREATE TRIGGER — CREATE OR REPLACE on the
-- function is enough, Postgres resolves by name at fire time.

-- ------------------------------------------------------------
-- 5. Backfill — set is_verified for everyone currently at or above
--    the threshold. Idempotent; safe to re-run if the threshold
--    changes. Wrapped as a function so the same logic is callable
--    from an admin session after changing the setting.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION recompute_is_verified()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  threshold INT := verified_threshold();
  changed   BIGINT;
BEGIN
  WITH updated AS (
    UPDATE profiles
    SET is_verified = (completed_jobs_count >= threshold)
    WHERE is_verified IS DISTINCT FROM (completed_jobs_count >= threshold)
    RETURNING id
  )
  SELECT COUNT(*) INTO changed FROM updated;
  RETURN changed;
END;
$$;

-- Run it once so existing data reflects the current threshold.
SELECT recompute_is_verified();

COMMIT;
