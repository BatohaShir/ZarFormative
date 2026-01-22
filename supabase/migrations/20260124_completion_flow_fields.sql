-- ============================================
-- Completion Flow Fields for listing_requests
-- Добавляет поля для процесса завершения работы
-- ============================================

-- Добавляем поля для описания завершенной работы
ALTER TABLE public.listing_requests
ADD COLUMN IF NOT EXISTS completion_description TEXT,
ADD COLUMN IF NOT EXISTS completion_photos TEXT[] DEFAULT '{}';

-- Добавляем комментарии
COMMENT ON COLUMN public.listing_requests.completion_description IS 'Описание проделанных работ от исполнителя';
COMMENT ON COLUMN public.listing_requests.completion_photos IS 'URL фотографий завершенной работы (до 3 фото)';

-- ============================================
-- Reviews Table
-- Таблица для хранения отзывов клиентов
-- ============================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_id TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT fk_reviews_request
    FOREIGN KEY (request_id)
    REFERENCES public.listing_requests(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_reviews_client
    FOREIGN KEY (client_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_reviews_provider
    FOREIGN KEY (provider_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE
);

-- Индексы для reviews
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON public.reviews(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);

-- Комментарии
COMMENT ON TABLE public.reviews IS 'Отзывы клиентов об исполнителях после завершения работы';
COMMENT ON COLUMN public.reviews.rating IS 'Оценка от 1 до 5';
COMMENT ON COLUMN public.reviews.comment IS 'Текстовый отзыв (опционально)';

-- ============================================
-- RLS Policies для reviews
-- ============================================

-- Включаем RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Все могут читать отзывы (публичная информация)
CREATE POLICY "reviews_public_read"
ON public.reviews FOR SELECT
TO public
USING (true);

-- Клиент может создавать отзыв
CREATE POLICY "reviews_client_insert"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

-- Клиент может редактировать свой отзыв
CREATE POLICY "reviews_client_update"
ON public.reviews FOR UPDATE
TO authenticated
USING (client_id = auth.uid());
