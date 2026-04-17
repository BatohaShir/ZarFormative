-- Migration: Add indexes for query optimization
-- Created: 2026-01-13
-- Description: Add B-tree indexes to optimize common queries

-- ==============================================
-- Profiles table indexes
-- ==============================================

-- Index for filtering active profiles (soft delete)
CREATE INDEX IF NOT EXISTS profiles_is_deleted_idx
ON profiles(is_deleted);

-- Index for filtering by account type (company/individual)
CREATE INDEX IF NOT EXISTS profiles_is_company_idx
ON profiles(is_company);

-- Index for sorting by registration date
CREATE INDEX IF NOT EXISTS profiles_created_at_idx
ON profiles(created_at);

-- ==============================================
-- Profiles Educations table indexes
-- ==============================================

-- Index for fetching user's educations
CREATE INDEX IF NOT EXISTS profiles_educations_user_id_idx
ON profiles_educations(user_id);

-- Composite index for sorted queries by user (used in useEducations hook)
-- Optimizes: WHERE user_id = ? ORDER BY start_date DESC
CREATE INDEX IF NOT EXISTS profiles_educations_user_id_start_date_idx
ON profiles_educations(user_id, start_date DESC);

-- ==============================================
-- Profiles Work Experiences table indexes
-- ==============================================

-- Index for fetching user's work experiences
CREATE INDEX IF NOT EXISTS profiles_work_experiences_user_id_idx
ON profiles_work_experiences(user_id);

-- Composite index for sorted queries by user (used in useWorkExperiences hook)
-- Optimizes: WHERE user_id = ? ORDER BY start_date DESC
CREATE INDEX IF NOT EXISTS profiles_work_experiences_user_id_start_date_idx
ON profiles_work_experiences(user_id, start_date DESC);
