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
          <span className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 flex items-center justify-center rounded-full bg-pink-500 text-white text-[10px] md:text-xs font-medium">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>
    </Link>
  );
}
