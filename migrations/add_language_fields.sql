-- Migration: Add language fields for i18n support
-- Date: 2026-02-01
-- Task: ZAR-42

-- 1. Add preferred_language column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'mn';

-- 2. Add name_ru and name_en columns to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS name_ru TEXT,
ADD COLUMN IF NOT EXISTS name_en TEXT;

-- 3. Add comment for documentation
COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language: mn (Mongolian), ru (Russian), en (English)';
COMMENT ON COLUMN categories.name_ru IS 'Category name in Russian';
COMMENT ON COLUMN categories.name_en IS 'Category name in English';
