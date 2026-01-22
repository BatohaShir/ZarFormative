-- ============================================
-- Fix Work Completion Photos RLS Policies
-- Исправляем сравнение UUID с text
-- ============================================

-- Удаляем старые политики если существуют
DROP POLICY IF EXISTS "work_completion_photos_provider_insert" ON storage.objects;
DROP POLICY IF EXISTS "work_completion_photos_provider_update" ON storage.objects;
DROP POLICY IF EXISTS "work_completion_photos_provider_delete" ON storage.objects;

-- Политика на загрузку: только исполнитель заявки может загружать
-- Путь: {request_id}/{uuid}.{ext}
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
