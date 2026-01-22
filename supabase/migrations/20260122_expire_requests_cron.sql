-- ============================================
-- Cron job для автоматической отмены просроченных заявок
-- ============================================

-- Включаем расширение pg_cron если еще не включено
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Функция для отмены просроченных заявок
CREATE OR REPLACE FUNCTION expire_overdue_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Создаем уведомления для клиентов перед обновлением статуса
  INSERT INTO notifications (id, user_id, type, title, message, request_id, actor_id, is_read, created_at)
  SELECT
    gen_random_uuid()::text,
    lr.client_id,
    'request_rejected'::text,
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

  -- Обновляем статус просроченных pending заявок
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

  -- Создаем уведомления для клиентов и провайдеров
  -- Для клиентов
  INSERT INTO notifications (id, user_id, type, title, message, request_id, actor_id, is_read, created_at)
  SELECT
    gen_random_uuid()::text,
    lr.client_id,
    'cancelled_by_provider'::text,
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
      -- Если есть preferred_time, проверяем дата + время + 2 часа
      (lr.preferred_time IS NOT NULL AND
       (lr.preferred_date + lr.preferred_time::time + INTERVAL '2 hours') < NOW())
      OR
      -- Если нет preferred_time, используем 9:00 + 2 часа = 11:00
      (lr.preferred_time IS NULL AND
       (lr.preferred_date + TIME '11:00:00') < NOW())
    );

  -- Для провайдеров
  INSERT INTO notifications (id, user_id, type, title, message, request_id, actor_id, is_read, created_at)
  SELECT
    gen_random_uuid()::text,
    lr.provider_id,
    'cancelled_by_provider'::text,
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

  -- Обновляем статус
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

  -- Возвращаем результат
  result := jsonb_build_object(
    'success', true,
    'timestamp', NOW(),
    'expired_pending', expired_pending_count,
    'expired_accepted', expired_accepted_count,
    'notifications_created', notifications_count + (expired_accepted_count * 2)
  );

  -- Логируем в консоль
  RAISE NOTICE 'expire_overdue_requests completed: %', result;

  RETURN result;
END;
$$;

-- Удаляем старый cron job если существует
SELECT cron.unschedule('expire-overdue-requests')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-overdue-requests'
);

-- Создаем cron job для запуска каждые 15 минут
SELECT cron.schedule(
  'expire-overdue-requests',           -- имя задачи
  '*/15 * * * *',                      -- каждые 15 минут
  $$SELECT expire_overdue_requests()$$ -- SQL команда
);

-- Комментарий для документации
COMMENT ON FUNCTION expire_overdue_requests() IS
'Автоматически отменяет просроченные заявки:
- pending: если прошло 24 часа без ответа
- accepted: если прошло 2 часа после назначенного времени начала работы
Создает уведомления для клиентов и провайдеров.
Запускается каждые 15 минут через pg_cron.';
