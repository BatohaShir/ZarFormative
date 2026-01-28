"use client";

import { useEffect, useState } from "react";

interface UseRealtimeViewsOptions {
  listingId: string;
  initialCount: number;
  enabled?: boolean;
}

/**
 * OPTIMIZATION: Упрощённый хук для счётчика просмотров
 * Убрана Supabase Realtime подписка - она создавала лишнюю нагрузку на WebSocket
 * для некритичной функциональности. Счётчик обновляется только при загрузке страницы.
 */
export function useRealtimeViews({
  initialCount,
}: UseRealtimeViewsOptions) {
  const [viewsCount, setViewsCount] = useState(initialCount);

  // Обновить счётчик при изменении initialCount (после view tracking)
  useEffect(() => {
    setViewsCount(initialCount);
  }, [initialCount]);

  return {
    viewsCount,
    // Оставляем для обратной совместимости
    isConnected: false,
    refetch: () => Promise.resolve(),
  };
}
