"use client";

import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
} from "@tanstack/react-query";
import { ReactNode, useState, useCallback } from "react";
import { Provider } from "@/lib/hooks";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 минут - данные считаются свежими
            gcTime: 1000 * 60 * 30, // 30 минут - хранение в памяти
            refetchOnWindowFocus: false,
            retry: 1,
            placeholderData: keepPreviousData,
          },
        },
      })
  );

  const fetchWithAuth = useCallback(
    (url: string, options?: RequestInit) =>
      fetch(url, { ...options, credentials: "include" }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Provider value={{ fetch: fetchWithAuth }}>{children}</Provider>
    </QueryClientProvider>
  );
}
