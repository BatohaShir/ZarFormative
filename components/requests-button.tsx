"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFindManylisting_requests } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface RequestsButtonProps {
  className?: string;
}

export function RequestsButton({ className }: RequestsButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // OPTIMIZATION: Один запрос вместо двух с OR условием
  // Считаем: входящие pending (provider) + отправленные активные (client)
  const { data: activeRequests } = useFindManylisting_requests(
    {
      where: {
        OR: [
          // Входящие pending заявки (где я provider)
          {
            provider_id: user?.id || "",
            status: "pending",
          },
          // Отправленные активные заявки (где я client)
          {
            client_id: user?.id || "",
            status: { in: ["pending", "accepted"] },
          },
        ],
      },
      select: { id: true },
    },
    {
      enabled: !!user?.id,
      staleTime: 60 * 1000, // OPTIMIZATION: Увеличили до 60 сек (было 30)
    }
  );

  // Realtime subscription for badge invalidation across the entire
  // app. The /account/me/requests page has its own surgical
  // patchRow hook for the full grid; this one is scoped to ANY
  // listing_requests change that touches the current user, so the
  // header badge updates instantly even when the user is on a
  // completely different page (home, listing detail, profile, …).
  // It uses prefix-match invalidation, not patching, because the
  // count query has tight `where` filters that aren't worth
  // mirroring here — the next refetch is one round-trip and the
  // user already saw the realtime event arrive.
  React.useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const supabase = createClient();
    const userId = user.id;
    const channel = supabase
      .channel(`requests-badge:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listing_requests" },
        (payload: {
          new: { client_id?: string; provider_id?: string } | null;
          old: { client_id?: string; provider_id?: string } | null;
        }) => {
          const isMine =
            payload.new?.client_id === userId ||
            payload.new?.provider_id === userId ||
            payload.old?.client_id === userId ||
            payload.old?.provider_id === userId;
          if (!isMine) return;
          queryClient.invalidateQueries({
            queryKey: ["zenstack", "listing_requests"],
            refetchType: "active",
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, queryClient]);

  const totalCount = activeRequests?.length || 0;

  // Only show if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Link href="/account/me/requests">
      <Button variant="ghost" size="icon" className={`relative ${className || ""}`}>
        <FileText className="h-5 w-5" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center leading-none">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
