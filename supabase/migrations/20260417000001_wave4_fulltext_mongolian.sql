-- ============================================================
-- Wave 4.1: Add Mongolian fulltext support
--
-- Mongolian has no native Postgres text search dictionary, so we use
-- the 'simple' config — no stemming, but at least tokenises on word
-- boundaries. Existing 'russian' and 'english' vectors stay because
-- the marketplace runs in three languages.
--
-- Weights A (title) and C (description) per-language so all three
-- can be OR-ed in the search query.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION listings_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple',  COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple',  COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$;

-- Rebuild vectors for existing rows so Mongolian content becomes
-- searchable immediately instead of waiting for the next UPDATE.
UPDATE listings SET
  search_vector =
    setweight(to_tsvector('russian', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('simple',  COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('simple',  COALESCE(description, '')), 'B');

COMMIT;
