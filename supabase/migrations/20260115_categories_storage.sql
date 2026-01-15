-- ============================================
-- Create categories storage bucket
-- ============================================

-- Create the categories bucket (public for read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'categories',
  'categories',
  true,  -- Public bucket for read access
  5242880,  -- 5MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- RLS Policies for categories bucket
-- ============================================

-- Allow anyone to read category icons (public bucket)
CREATE POLICY "Anyone can view category icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'categories');

-- Allow authenticated users to upload category icons
-- (In production, restrict to admin role)
CREATE POLICY "Authenticated users can upload category icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'categories'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update category icons
CREATE POLICY "Authenticated users can update category icons"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'categories'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete category icons
CREATE POLICY "Authenticated users can delete category icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'categories'
  AND auth.role() = 'authenticated'
);
