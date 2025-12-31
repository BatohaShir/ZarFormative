"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, Plus, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/contexts/favorites-context";
import { useMessages } from "@/contexts/messages-context";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { AuthModal } from "./auth-modal";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { favorites } = useFavorites();
  const { totalUnreadCount } = useMessages();
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const handleMessagesClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Нүүр",
      isActive: isActive("/") && pathname === "/",
      badge: null,
    },
    {
      href: "/favorites",
      icon: Heart,
      label: "Лайк",
      isActive: isActive("/favorites"),
      badge: favorites.length > 0 ? favorites.length : null,
    },
    {
      href: "/services/create",
      icon: Plus,
      label: "Зарлах",
      isActive: isActive("/services/create"),
      badge: null,
      isCenter: true,
    },
    {
      href: "/messages",
      icon: MessageCircle,
      label: "Мессеж",
      isActive: isActive("/messages"),
      badge: totalUnreadCount > 0 ? totalUnreadCount : null,
      onClick: handleMessagesClick,
    },
    {
      href: "/account/me",
      icon: User,
      label: "Профайл",
      isActive: isActive("/account"),
      badge: null,
      onClick: handleProfileClick,
    },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
        <div className="flex items-center justify-around h-16 px-2 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;

            if (item.isCenter) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative -top-4 flex flex-col items-center justify-center"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full shadow-lg transition-all",
                      "h-14 w-14 bg-linear-to-r from-blue-600 to-blue-500",
                      "hover:shadow-xl hover:scale-105"
                    )}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-primary mt-1">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.onClick}
                className="flex flex-col items-center justify-center min-w-[60px] py-2 relative"
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  />
                  {item.badge !== null && (
                    <div
                      className={cn(
                        "absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full flex items-center justify-center text-[10px] font-semibold text-white",
                        item.label === "Мессеж"
                          ? "bg-red-500"
                          : "bg-pink-500"
                      )}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium mt-0.5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
}
