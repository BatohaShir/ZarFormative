"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  /** When set, a back chevron appears before the logo and links to this href. */
  backHref?: string;
}

export function SiteHeader({ backHref }: SiteHeaderProps = {}) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Буцах"
              className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors -ml-1"
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Link>
          )}
          <Link
            href="/"
            className="text-lg md:text-xl font-display font-bold tracking-tight"
            aria-label="Tsogts.mn"
          >
            <span className="text-[#015197]">Tsogts</span>
            <span className="text-accent">.mn</span>
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <NotificationsButton />
        </div>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          <NotificationsButton />
          <RequestsButton />
          <FavoritesButton />
          <ThemeToggle />
          <div className="ml-2">
            <AuthModal />
          </div>
        </nav>
      </div>
    </header>
  );
}
