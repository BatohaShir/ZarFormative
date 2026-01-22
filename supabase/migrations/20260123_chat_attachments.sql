-- ============================================
-- Chat Attachments Migration
-- Добавляет поддержку вложений (изображения, геолокация) в чат
-- ============================================

-- 1. Добавляем поля для вложений в chat_messages
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS location_name VARCHAR(255);

-- Комментарии к полям
COMMENT ON COLUMN chat_messages.attachment_type IS 'Type of attachment: image, location, or null';
COMMENT ON COLUMN chat_messages.attachment_url IS 'Signed URL for image attachments (private bucket)';
COMMENT ON COLUMN chat_messages.location_lat IS 'Latitude for location attachments';
COMMENT ON COLUMN chat_messages.location_lng IS 'Longitude for location attachments';
COMMENT ON COLUMN chat_messages.location_name IS 'Optional name/address for location';

-- 2. Индекс для фильтрации по типу вложения (только для сообщений с вложениями)
CREATE INDEX IF NOT EXISTS idx_chat_messages_attachment
ON chat_messages(request_id, attachment_type)
WHERE attachment_type IS NOT NULL;

-- ============================================
-- 3. Создаем приватный bucket для вложений чата
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,  -- ПРИВАТНЫЙ bucket - требуется signed URL
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 4. RLS Policies для chat-attachments bucket
-- ============================================

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Chat participants can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Sender can delete own chat attachments" ON storage.objects;

-- Участники чата могут просматривать вложения
CREATE POLICY "Chat participants can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.listing_requests lr
    WHERE lr.id = (storage.foldername(name))[1]::text
    AND (lr.client_id = auth.uid() OR lr.provider_id = auth.uid())
  )
);

-- Участники чата могут загружать вложения
CREATE POLICY "Chat participants can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.listing_requests lr
    WHERE lr.id = (storage.foldername(name))[1]::text
    AND (lr.client_id = auth.uid() OR lr.provider_id = auth.uid())
  )
);

-- Отправитель может удалять свои вложения (sender_id в пути)
CREATE POLICY "Sender can delete own chat attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
