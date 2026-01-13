"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { ChevronLeft, User, LogOut, Settings, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";
import { LoginPromptModal } from "@/components/login-prompt-modal";

export default function MyProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
  };

  const handleLoginModalClose = (open: boolean) => {
    if (!open && !isAuthenticated) {
      router.push("/");
    } else {
      setShowLoginModal(open);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background pb-20 md:pb-0 flex items-center justify-center">
          <div className="text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Нэвтэрнэ үү</h2>
            <p className="text-muted-foreground mb-4">
              Профайл харахын тулд нэвтэрнэ үү
            </p>
          </div>
        </div>
        <LoginPromptModal
          open={showLoginModal}
          onOpenChange={handleLoginModalClose}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Link href="/">
              <h1 className="text-lg md:text-2xl font-bold">
                <span className="text-[#c4272f]">Uilc</span>
                <span className="text-[#015197]">hilge</span>
                <span className="text-[#c4272f]">e.mn</span>
              </h1>
            </Link>
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <RequestsButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        {/* Profile Header */}
        <div className="border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{user?.name || "Хэрэглэгч"}</h2>
              <p className="text-muted-foreground">{user?.email || ""}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-muted-foreground">Үйлчилгээ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-muted-foreground">Амжилттай</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">0</div>
              <div className="text-sm text-muted-foreground">Лайк</div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          <Link href="/account/settings">
            <Button
              variant="ghost"
              className="w-full justify-start h-14 text-base"
            >
              <Settings className="h-5 w-5 mr-3" />
              Тохиргоо
            </Button>
          </Link>

          <Button
            variant="ghost"
            className="w-full justify-start h-14 text-base"
            onClick={toggleTheme}
          >
            {mounted && theme === "dark" ? (
              <>
                <Sun className="h-5 w-5 mr-3" />
                Цагаан горим
              </>
            ) : (
              <>
                <Moon className="h-5 w-5 mr-3" />
                Хар горим
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start h-14 text-base text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Гарах
          </Button>
        </div>

        {/* App Info */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>Uilchilgee.mn v1.0.0</p>
          <p className="mt-1">© 2024 Бүх эрх хуулиар хамгаалагдсан</p>
        </div>
      </div>
    </div>
  );
}
