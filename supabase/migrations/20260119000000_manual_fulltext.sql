-- Full-text search для listings
-- Этот скрипт добавляет полнотекстовый поиск с поддержкой русского и английского языков

-- 1. Добавляем колонку search_vector
ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Создаём GIN индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS listings_search_idx ON listings USING GIN(search_vector);

-- 3. Создаём функцию для обновления search_vector
CREATE OR REPLACE FUNCTION listings_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Создаём триггер для автоматического обновления при INSERT/UPDATE
DROP TRIGGER IF EXISTS listings_search_vector_trigger ON listings;
CREATE TRIGGER listings_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description ON listings
  FOR EACH ROW
  EXECUTE FUNCTION listings_search_vector_update();

-- 5. Заполняем search_vector для существующих записей
UPDATE listings SET
  search_vector =
    setweight(to_tsvector('russian', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B');
