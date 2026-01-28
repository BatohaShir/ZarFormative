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

  // Считаем входящие pending заявки (где я provider)
  const { data: incomingPending } = useFindManylisting_requests(
    {
      where: {
        provider_id: user?.id || "",
        status: "pending",
      },
      select: { id: true },
    },
    {
      enabled: !!user?.id,
      staleTime: 30 * 1000,
    }
  );

  // Считаем отправленные активные заявки (где я client) - pending или accepted
  const { data: sentActive } = useFindManylisting_requests(
    {
      where: {
        client_id: user?.id || "",
        status: { in: ["pending", "accepted"] },
      },
      select: { id: true },
    },
    {
      enabled: !!user?.id,
      staleTime: 30 * 1000,
    }
  );

  const totalCount = (incomingPending?.length || 0) + (sentActive?.length || 0);

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
