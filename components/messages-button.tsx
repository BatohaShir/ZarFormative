"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface MessagesButtonProps {
  className?: string;
}

// Mock unread count - in real app this would come from a context or API
const UNREAD_COUNT = 2;

export function MessagesButton({ className }: MessagesButtonProps) {
  const { isAuthenticated } = useAuth();

  // Only show if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Link href="/messages">
      <Button variant="ghost" size="icon" className={`relative ${className || ""}`}>
        <MessageCircle className="h-5 w-5" />
        {UNREAD_COUNT > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {UNREAD_COUNT}
          </span>
        )}
      </Button>
    </Link>
  );
}
