-- ============================================================
-- Function hardening: revoke PUBLIC EXECUTE + pin search_path
--
-- Two issues the Supabase advisors flagged, both on functions in
-- the PostgREST-exposed `public` schema.
--
-- ── 1. PUBLIC still holds EXECUTE ──────────────────────────
--
-- 20260820000000_rls_lockdown.sql revoked EXECUTE from `anon`
-- and `authenticated`, but the advisor kept reporting the same
-- seven functions. Checking pg_proc.proacl showed why:
--
--   =X/postgres | postgres=X/postgres | service_role=X/postgres
--
-- The leading `=X/postgres` is a grant to PUBLIC — the implicit
-- role every other role inherits from. Postgres grants EXECUTE to
-- PUBLIC on every new function by default, so revoking from
-- `anon` individually changes nothing: the privilege arrives
-- through PUBLIC instead.
--
-- Confirmed by calling it: POST /rest/v1/rpc/cleanup_old_listing_views
-- with nothing but the anon key returned 200 and ran the function.
-- Two of these mutate real state — expire_overdue_requests flips
-- request statuses and emits notifications, and the cleanup_*
-- ones delete rows — so an anonymous caller could fire them in a
-- loop.
--
-- The fix is REVOKE ... FROM PUBLIC. service_role and postgres
-- keep their explicit grants, which is what pg_cron and the
-- Supabase auth triggers actually run as.
--
-- ── 2. Mutable search_path ─────────────────────────────────
--
-- None of these functions pin search_path. For a SECURITY DEFINER
-- function that is a privilege-escalation vector: the caller can
-- point search_path at a schema holding their own `listings` or
-- `now()`, and the function body resolves to those instead —
-- executing attacker-controlled code as the definer.
--
-- ALTER FUNCTION ... SET search_path is applied rather than
-- rewriting each body, so the function logic is untouched.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Take EXECUTE away from PUBLIC on the SECURITY DEFINER set.
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.expire_overdue_requests()        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_and_prune_boosts()        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications()      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_listing_views()      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_request_locations()  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_user_deleted()            FROM PUBLIC;

-- ------------------------------------------------------------
-- 2. Pin search_path on every flagged function.
--
-- `public, pg_temp` keeps current resolution behaviour; pg_temp
-- is listed last on purpose so a caller's temporary schema can
-- never shadow a real table.
-- ------------------------------------------------------------

-- SECURITY DEFINER (highest risk — these run as the definer)
ALTER FUNCTION public.expire_overdue_requests()        SET search_path = public, pg_temp;
ALTER FUNCTION public.expire_and_prune_boosts()        SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_old_notifications()      SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_old_listing_views()      SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_old_request_locations()  SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user()                SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_user_deleted()            SET search_path = public, pg_temp;

-- Trigger functions and helpers (SECURITY INVOKER, but pinning
-- search_path is still the documented hardening step)
ALTER FUNCTION public.update_profile_stats()           SET search_path = public, pg_temp;
ALTER FUNCTION public.update_completed_jobs_count()    SET search_path = public, pg_temp;
ALTER FUNCTION public.recalc_provider_rating(uuid)     SET search_path = public, pg_temp;
ALTER FUNCTION public.reviews_counters_trigger()       SET search_path = public, pg_temp;
ALTER FUNCTION public.favorites_counter_trigger()      SET search_path = public, pg_temp;
ALTER FUNCTION public.listings_published_at_trigger()  SET search_path = public, pg_temp;
ALTER FUNCTION public.listings_search_vector_update()  SET search_path = public, pg_temp;
ALTER FUNCTION public.completed_jobs_counter_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_is_verified()          SET search_path = public, pg_temp;
ALTER FUNCTION public.verified_threshold()             SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column()       SET search_path = public, pg_temp;
