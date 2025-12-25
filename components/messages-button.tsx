"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useMessages } from "@/contexts/messages-context";

interface MessagesButtonProps {
  className?: string;
}

export function MessagesButton({ className }: MessagesButtonProps) {
  const { isAuthenticated } = useAuth();
  const { totalUnreadCount } = useMessages();

  // Only show if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Link href="/messages">
      <Button variant="ghost" size="icon" className={`relative ${className || ""}`}>
        <MessageCircle className="h-5 w-5" />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {totalUnreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
