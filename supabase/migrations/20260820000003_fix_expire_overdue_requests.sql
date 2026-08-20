-- ============================================================
-- Fix expire_overdue_requests(): broken since the cuid→uuid move
--
-- Found while verifying that the function-hardening migration had
-- not broken pg_cron. It had not — but cron.job_run_details showed
-- this job had never succeeded:
--
--   first failure : 2026-04-17 02:15 UTC
--   last success  : (none)
--   failures      : 12 017
--
-- Every run since April dies on the first statement:
--
--   ERROR: column "id" is of type uuid but expression is of type text
--   LINE 3:  gen_random_uuid()::text
--
-- 20260122000000_cuid_to_uuid.sql converted notifications.id (and
-- user_id / request_id / actor_id) from text-shaped cuids to uuid,
-- but this function kept casting the generated uuid back to text.
-- The whole body runs in one transaction, so the failing INSERT
-- rolls back everything after it too.
--
-- User-visible consequence, unfixed for four months:
--   * pending requests are never auto-cancelled after 24h — they
--     sit in the provider's queue forever
--   * accepted requests whose start time passed are never cleaned
--     up either
--   * neither side gets the "expired" notification
--
-- The /api/cron/expire-requests route implements the same logic in
-- TypeScript and does work, so the damage was masked wherever that
-- endpoint is actually scheduled. This restores the database-side
-- path that pg_cron drives every 15 minutes.
--
-- Changes, all type fixes — the logic and thresholds are untouched:
--   * gen_random_uuid()::text        → gen_random_uuid()
--   * 'request_rejected'::text       → 'request_expired'::"NotificationType"
--   * 'cancelled_by_provider'::text  → ::"NotificationType"
--
-- `request_expired` is the enum member the schema documents for
-- exactly this case ("Хүсэлт хугацаа дууссан — исполнитель не успел
-- принять"); the old text literal 'request_rejected' predates it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.expire_overdue_requests()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  expired_pending_count INT := 0;
  expired_accepted_count INT := 0;
  notifications_count INT := 0;
  pending_deadline TIMESTAMPTZ;
  result JSONB;
BEGIN
  -- Дедлайн для pending: 24 часа назад
  pending_deadline := NOW() - INTERVAL '24 hours';

  -- ========================================
  -- 1. Отмена PENDING заявок старше 24 часов
  -- ========================================

  INSERT INTO notifications (id, user_id, type, title, message, request_id, actor_id, is_read, created_at)
  SELECT
    gen_random_uuid(),
    lr.client_id,
    'request_expired'::"NotificationType",
    'Хүсэлт хугацаа дууссан',
    '"' || l.title || '" хүсэлт 24 цагийн дотор хариулагдаагүй тул цуцлагдлаа',
    lr.id,
    NULL,
    false,
    NOW()
  FROM listing_requests lr
  JOIN listings l ON l.id = lr.listing_id
  WHERE lr.status = 'pending'
    AND lr.created_at < pending_deadline;

  GET DIAGNOSTICS notifications_count = ROW_COUNT;

  UPDATE listing_requests
  SET
    status = 'cancelled_by_provider',
    provider_response = 'Хүсэлт 24 цагийн дотор хариулагдаагүй тул автоматаар цуцлагдлаа',
    updated_at = NOW()
  WHERE status = 'pending'
    AND created_at < pending_deadline;

  GET DIAGNOSTICS expired_pending_count = ROW_COUNT;

  -- ========================================
  -- 2. Отмена ACCEPTED заявок с просроченным временем начала
  -- ========================================

  -- Для клиентов
  INSERT INTO notifications (id, user_id, type, title, message, request_id, actor_id, is_read, created_at)
  SELECT
    gen_random_uuid(),
    lr.client_id,
    'cancelled_by_provider'::"NotificationType",
    'Захиалга цуцлагдлаа',
    '"' || l.title || '" захиалга хугацаандаа эхлээгүй тул автоматаар цуцлагдлаа',
    lr.id,
    NULL,
    false,
    NOW()
  FROM listing_requests lr
  JOIN listings l ON l.id = lr.listing_id
  WHERE lr.status = 'accepted'
    AND lr.preferred_date IS NOT NULL
    AND (
      (lr.preferred_time IS NOT NULL AND
       (lr.preferred_date + lr.preferred_time::time + INTERVAL '2 hours') < NOW())
      OR
      (lr.preferred_time IS NULL AND
       (lr.preferred_date + TIME '11:00:00') < NOW())
    );

  -- Для провайдеров
  INSERT INTO notifications (id, user_id, type, title, message, request_id, actor_id, is_read, created_at)
  SELECT
    gen_random_uuid(),
    lr.provider_id,
    'cancelled_by_provider'::"NotificationType",
    'Захиалга цуцлагдлаа',
    '"' || l.title || '" захиалга хугацаандаа эхлээгүй тул автоматаар цуцлагдлаа',
    lr.id,
    NULL,
    false,
    NOW()
  FROM listing_requests lr
  JOIN listings l ON l.id = lr.listing_id
  WHERE lr.status = 'accepted'
    AND lr.preferred_date IS NOT NULL
    AND (
      (lr.preferred_time IS NOT NULL AND
       (lr.preferred_date + lr.preferred_time::time + INTERVAL '2 hours') < NOW())
      OR
      (lr.preferred_time IS NULL AND
       (lr.preferred_date + TIME '11:00:00') < NOW())
    );

  UPDATE listing_requests
  SET
    status = 'cancelled_by_provider',
    provider_response = 'Ажил хугацаандаа эхлээгүй тул автоматаар цуцлагдлаа',
    updated_at = NOW()
  WHERE status = 'accepted'
    AND preferred_date IS NOT NULL
    AND (
      (preferred_time IS NOT NULL AND
       (preferred_date + preferred_time::time + INTERVAL '2 hours') < NOW())
      OR
      (preferred_time IS NULL AND
       (preferred_date + TIME '11:00:00') < NOW())
    );

  GET DIAGNOSTICS expired_accepted_count = ROW_COUNT;

  result := jsonb_build_object(
    'success', true,
    'timestamp', NOW(),
    'expired_pending', expired_pending_count,
    'expired_accepted', expired_accepted_count,
    'notifications_created', notifications_count + (expired_accepted_count * 2)
  );

  RAISE NOTICE 'expire_overdue_requests completed: %', result;

  RETURN result;
END;
$function$;

-- CREATE OR REPLACE resets the ACL, so re-apply the lockdown from
-- 20260820000002 — otherwise PUBLIC gets EXECUTE back by default.
REVOKE EXECUTE ON FUNCTION public.expire_overdue_requests() FROM PUBLIC;
