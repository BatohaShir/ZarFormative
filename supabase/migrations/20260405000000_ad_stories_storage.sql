-- ============================================
-- Create ad-stories storage bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-stories',
  'ad-stories',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- RLS Policies for ad-stories bucket
-- ============================================

-- Anyone can view story images (public)
CREATE POLICY "Anyone can view ad story images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-stories');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload ad story images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad-stories'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own story images
CREATE POLICY "Users can delete own ad story images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad-stories'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
