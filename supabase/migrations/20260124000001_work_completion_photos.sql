-- ============================================
-- Work Completion Photos Bucket
-- Публичный bucket для фотографий завершенных работ
-- ============================================

-- Создаем публичный bucket для фото завершенных работ
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'work-completion-photos',
  'work-completion-photos',
  true,  -- Публичный доступ
  5242880,  -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================
-- RLS Policies для work-completion-photos bucket
-- ============================================

-- Политика на чтение: все могут читать (публичный bucket)
CREATE POLICY "work_completion_photos_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'work-completion-photos');

-- Политика на загрузку: только исполнитель заявки может загружать
-- Путь: work-completion-photos/{request_id}/{uuid}.{ext}
CREATE POLICY "work_completion_photos_provider_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-completion-photos'
  AND (
    -- Проверяем что пользователь является исполнителем заявки
    EXISTS (
      SELECT 1 FROM public.listing_requests
      WHERE id::text = (storage.foldername(name))[1]
      AND provider_id = auth.uid()
    )
  )
);

-- Политика на обновление: только исполнитель заявки
CREATE POLICY "work_completion_photos_provider_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'work-completion-photos'
  AND EXISTS (
    SELECT 1 FROM public.listing_requests
    WHERE id::text = (storage.foldername(name))[1]
    AND provider_id = auth.uid()
  )
);

-- Политика на удаление: только исполнитель заявки
CREATE POLICY "work_completion_photos_provider_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-completion-photos'
  AND EXISTS (
    SELECT 1 FROM public.listing_requests
    WHERE id::text = (storage.foldername(name))[1]
    AND provider_id = auth.uid()
  )
);
