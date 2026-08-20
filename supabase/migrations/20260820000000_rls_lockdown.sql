-- ============================================================
-- RLS lockdown — closes finding C1 from SECURITY_PLAN.md
--
-- Audit of the live database (2026-08-20) found three tables in
-- the PostgREST-exposed `public` schema with RLS switched off
-- entirely, and the `anon` role holding full DML on them:
--
--   app_settings    — verified-badge threshold
--   listing_boosts  — paid VIP placements
--   ad_stories      — user-submitted ad stories
--
-- Verified by calling PostgREST with the public anon key: rows
-- came back for app_settings and ad_stories with no auth at all.
-- Since `anon` also held INSERT/UPDATE/DELETE/TRUNCATE, anyone
-- with the anon key (it ships to every browser by design) could
-- rewrite the verified threshold, grant themselves a VIP boost,
-- or edit other people's stories.
--
-- Two independent fixes, because either alone is incomplete:
--   1. ENABLE RLS on the three tables — without a policy this is
--      deny-all for anon/authenticated, matching the 10 other
--      tables that are already protected this way.
--   2. REVOKE write DML from anon on every table in `public`.
--      Defense in depth: a future table created without RLS
--      would otherwise be writable by anonymous callers again.
--
-- Why this does not break the app: all application reads and
-- writes go through Prisma over DATABASE_URL, which connects as
-- the database owner and bypasses both RLS and these grants.
-- The only direct browser→table access in the codebase is
-- request_locations (live tracking), which is already RLS-
-- protected with a SELECT-only policy and therefore unaffected.
--
-- Realtime is likewise unaffected: it authorizes via RLS SELECT
-- policies, which this migration does not touch.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enable RLS on the three unprotected tables.
--
-- No policies are added on purpose. These tables are written
-- exclusively by server-side Prisma, so deny-all for the
-- PostgREST roles is the correct end state. Adding a policy
-- later is how you'd expose a table to direct client reads.
-- ------------------------------------------------------------

ALTER TABLE public.app_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_stories     ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2. Strip write privileges from the anonymous role.
--
-- SELECT is deliberately left in place: RLS already governs what
-- anon can read, and revoking SELECT would mask policy bugs
-- behind a permission error instead of surfacing them.
--
-- TRUNCATE is included — it is not covered by RLS at all, so a
-- table with RLS enabled but TRUNCATE granted is still wipeable.
-- ------------------------------------------------------------

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON ALL TABLES IN SCHEMA public
  FROM anon;

-- Same treatment for tables created after this migration runs,
-- so the hole cannot silently reopen with the next model.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon;

-- ------------------------------------------------------------
-- 3. Stop anonymous callers from invoking maintenance routines.
--
-- These are SECURITY DEFINER functions reachable over
-- /rest/v1/rpc/<name>. expire_overdue_requests mutates request
-- state and fires notifications; the cleanup_* ones delete rows;
-- handle_new_user / handle_user_deleted are auth triggers that
-- were never meant to be callable by hand. They are invoked by
-- pg_cron and by Supabase auth triggers, neither of which runs
-- as `anon` or `authenticated`.
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.expire_overdue_requests()        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_and_prune_boosts()        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications()      FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_listing_views()      FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_request_locations()  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_deleted()            FROM anon, authenticated;
