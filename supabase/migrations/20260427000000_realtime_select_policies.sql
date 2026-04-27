-- ============================================================
-- Realtime delivery requires SELECT policies for the subscriber
-- ============================================================
--
-- Supabase Realtime evaluates RLS on every change event using the
-- subscriber's JWT before delivering it. Tables with RLS enabled but
-- NO policies behave as "deny all" — replication events are produced
-- by Postgres, propagated to the realtime worker, and then silently
-- dropped because no policy permits SELECT for the authenticated
-- role. The result: optimistic UI updates feel instant for the actor,
-- but the counterparty never sees the realtime patch.
--
-- All server-side reads (Prisma, server actions, ZenStack server
-- procedures) bypass RLS by design — they connect as `postgres` /
-- service role. So this gap was invisible until the realtime channel
-- was actually exercised. The migration adds the minimum SELECT
-- policy each table needs for realtime delivery to work.
--
-- WRITE policies are intentionally NOT added. Mutations all go
-- through ZenStack's server-side enforcement (`@@allow` rules in
-- schema.zmodel). Adding INSERT/UPDATE/DELETE policies here would
-- duplicate that and risk drift between the two enforcement layers.

-- ------------------------------------------------------------
-- listing_requests: a request is visible to its client and provider
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Participants can view their requests" ON public.listing_requests;
CREATE POLICY "Participants can view their requests"
  ON public.listing_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = client_id OR auth.uid() = provider_id
  );

-- ------------------------------------------------------------
-- chat_messages: a message is visible to participants of its parent
-- listing_request. We join through listing_requests rather than
-- duplicate sender_id checks, because both client AND provider need
-- to read the other side's messages.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Participants can view messages of their requests" ON public.chat_messages;
CREATE POLICY "Participants can view messages of their requests"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listing_requests lr
      WHERE lr.id = chat_messages.request_id
        AND (lr.client_id = auth.uid() OR lr.provider_id = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- request_locations: same pattern as chat_messages — visible to the
-- request's two participants. Already in supabase_realtime per the
-- earlier 20260128 migration; this just unblocks delivery.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Participants can view request locations" ON public.request_locations;
CREATE POLICY "Participants can view request locations"
  ON public.request_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listing_requests lr
      WHERE lr.id = request_locations.request_id
        AND (lr.client_id = auth.uid() OR lr.provider_id = auth.uid())
    )
  );
