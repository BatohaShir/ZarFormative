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
export function useSearch({
  query,
  limit = 20,
  offset = 0,
  enabled = true,
}: UseSearchOptions) {
  return useQuery<SearchResponse>({
    queryKey: ["search", query, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`/api/search?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      return response.json();
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000, // 30 секунд - результаты поиска кэшируются ненадолго
    gcTime: 5 * 60 * 1000, // 5 минут
    placeholderData: (previousData) => previousData,
  });
}
