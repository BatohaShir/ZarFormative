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

  // Считаем только pending входящие заявки (где я provider)
  const { data: pendingRequests } = useFindManylisting_requests(
    {
      where: {
        provider_id: user?.id || "",
        status: "pending",
      },
      select: { id: true },
    },
    {
      enabled: !!user?.id,
      staleTime: 30 * 1000, // 30 секунд
    }
  );

  const pendingCount = pendingRequests?.length || 0;

  // Only show if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Link href="/account/me/requests">
      <Button variant="ghost" size="icon" className={`relative ${className || ""}`}>
        <FileText className="h-5 w-5" />
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
