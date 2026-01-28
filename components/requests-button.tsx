"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFindManylisting_requests } from "@/lib/hooks";

interface RequestsButtonProps {
  className?: string;
}

export function RequestsButton({ className }: RequestsButtonProps) {
  const { user, isAuthenticated } = useAuth();

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
