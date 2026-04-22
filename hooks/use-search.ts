"use client";

import { useQuery } from "@tanstack/react-query";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number | null;
  currency: string;
  is_negotiable: boolean;
  views_count: number;
  created_at: string;
  category: {
    name: string;
    slug: string;
  };
  cover_image: string | null;
  aimag: string | null;
  user: {
    name: string;
    avatar: string | null;
  };
  relevance: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  limit: number;
  offset: number;
}

interface UseSearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

/**
 * Хук для полнотекстового поиска объявлений
 * Использует PostgreSQL tsvector для быстрого поиска с ранжированием
 */
export function useSearch({ query, limit = 20, offset = 0, enabled = true }: UseSearchOptions) {
  return useQuery<SearchResponse>({
    queryKey: ["search", query, limit, offset],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      // AbortController signal - автоматически отменяет запрос при навигации или новом поиске
      const response = await fetch(`/api/search?${params}`, {
        credentials: "include",
        signal, // Передаём signal от React Query для отмены запроса
      });

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      return response.json();
    },
    enabled: enabled && query.length >= 2,
    // 5 min — same as the /api/services client cache. The user's typing
    // cycle ("Сан" → "Санте" → "Сантехник") never leaves cache, and
    // revisiting a query a minute later is free.
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    // Keep showing previous results while the new query is inflight —
    // no empty flash on every keystroke.
    placeholderData: (previousData) => previousData,
  });
}
