-- ============================================================
-- profiles: stop leaking personal data to anonymous callers
--
-- Follow-up to 20260820000000_rls_lockdown.sql. That migration
-- closed the three tables that had RLS switched off entirely;
-- this one fixes a table that *has* RLS but whose policy grants
-- everything to everyone.
--
-- The existing policy is literally:
--
--   CREATE POLICY "Public profiles are viewable by everyone"
--     ON profiles FOR SELECT TO public USING (true);
--
-- Verified against the live database with the public anon key:
-- GET /rest/v1/profiles returned all 10 rows including
-- `phone_number`, `role` and `is_deleted`. Postgres RLS filters
-- rows, not columns, so `USING (true)` hands over the whole row —
-- there is no way to expose a subset of fields through it.
--
-- For a government-facing service in Mongolia this is a ready-made
-- phone directory available to anyone who opens the site, since
-- the anon key ships to every browser by design.
--
-- Why dropping the policy outright is safe:
--
--   * No code path reads `profiles` directly from the browser.
--     Every read goes through Prisma (server-side, connects as the
--     database owner, bypasses RLS) or through ZenStack's enhanced
--     client, which applies the schema's own @@allow rules.
--     Verified by grepping for supabase.from("profiles") — no hits
--     outside the generated hooks.
--
--   * The public profile page already avoids the sensitive column:
--     lib/profile/public-profile-query.ts documents that
--     phone_number is deliberately not selected.
--
--   * Realtime keeps working for the one place that needs it.
--     use-realtime-profile.ts subscribes with filter id=eq.<uid>
--     and its only caller (my-profile-client.tsx) passes the
--     signed-in user's own id, which the owner policy below still
--     covers. Realtime authorizes through SELECT policies, so an
--     owner-scoped policy is exactly what that subscription needs.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Remove the blanket public-read policy.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- ------------------------------------------------------------
-- 2. Let a signed-in user read their own profile.
--
-- This is what keeps the realtime subscription on
-- `profile-<uid>` alive. Anonymous callers get nothing, which is
-- the correct end state: public profile pages are rendered
-- server-side through Prisma, not fetched from the browser.
-- ------------------------------------------------------------

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ------------------------------------------------------------
-- 3. Tighten the self-update policy with a WITH CHECK clause.
--
-- The existing UPDATE policy has USING (auth.uid() = id) but no
-- WITH CHECK, so the row is only tested *before* the write. A
-- crafted PATCH could therefore set `id` to somebody else's uuid
-- and hand the row over — the pre-image passes the check, the
-- post-image is never examined. WITH CHECK closes that.
--
-- `role` and `is_verified` are guarded too: they drive admin
-- access and the verified badge, and both are meant to be set
-- server-side only (is_verified by the completed_jobs trigger).
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------
-- 4. Drop the client-side INSERT policy.
--
-- Profiles are created by the handle_new_user() trigger on
-- auth.users, which runs as SECURITY DEFINER and is unaffected by
-- RLS. schema.zmodel already denies create through the API layer
-- (`@@deny('create', true)`) precisely so nobody can mint a
-- profile row for an arbitrary auth uuid; this removes the same
-- capability at the database level.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
