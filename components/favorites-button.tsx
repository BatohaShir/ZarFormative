"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useFavorites } from "@/contexts/favorites-context";

interface FavoritesButtonProps {
  className?: string;
}

export function FavoritesButton({ className }: FavoritesButtonProps) {
  const { count } = useFavorites();

  return (
    <Link href="/account/me/favorites">
      <Button variant="ghost" size="icon" className={`relative ${className || ""}`}>
        <Heart className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 bg-pink-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>
    </Link>
  );
}
