"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { ChevronLeft } from "lucide-react";

function Logo() {
  return (
    <Link href="/">
      <span className="text-lg md:text-2xl font-bold" aria-label="Tsogts.mn">
        <span className="text-[#015197]">Tsogts</span>
        <span className="text-[#c4272f]">.mn</span>
      </span>
    </Link>
  );
}

function BackButton() {
  return (
    <Link href="/">
      <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
        <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
      </Button>
    </Link>
  );
}

function NavDesktop({ children }: { children?: React.ReactNode }) {
  return (
    <nav className="hidden md:flex items-center gap-4">
      {children}
      <NotificationsButton />
      <RequestsButton />
      <FavoritesButton />
      <ThemeToggle />
      <AuthModal />
    </nav>
  );
}

function NavMobile({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex md:hidden items-center gap-2">
      {children}
      <ThemeToggle />
      <NotificationsButton />
    </div>
  );
}

/**
 * Home page header: logo + full nav
 */
export function HomeHeader() {
  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        <Logo />
        <NavMobile />
        <NavDesktop />
      </div>
    </header>
  );
}

/**
 * Inner page header: back button + logo + full nav
 */
export function InnerHeader() {
  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <BackButton />
          <Logo />
        </div>
        <NavMobile />
        <NavDesktop />
      </div>
    </header>
  );
}
