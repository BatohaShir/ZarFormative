"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { useAuth } from "@/contexts/auth-context";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronDown,
  BadgeCheck,
  Send,
  Inbox,
  Zap,
  Calendar,
  CalendarDays,
  Clock,
  Star,
  MessageSquare,
} from "lucide-react";

// ============================================
// Skeleton
// ============================================

function StatsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </header>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </div>
  );
}

// ============================================
// Reviews Section (collapsible)
// ============================================

function ReviewsSection({
  reviews,
  t,
}: {
  reviews: {
    total: number;
    averageRating: number;
    items: { id: string; author: string; rating: number; text: string; date: string }[];
  };
  t: (key: string) => string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="rounded-2xl border bg-card mb-4 overflow-hidden">
      {/* Header — always visible, clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 md:p-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-6">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            {t("reviews")}
          </h3>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-xl font-bold">{reviews.averageRating}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {reviews.total} {t("reviewCount")}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Collapsible review list */}
      {isOpen && (
        <div className="px-5 md:px-6 pb-5 md:pb-6 space-y-3">
          <div className="h-px bg-border -mt-1 mb-3" />
          {reviews.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noReviews")}</p>
          ) : (
            reviews.items.map((review) => (
              <div key={review.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold">
                  {review.author.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{review.author}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.text}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">{review.date}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Page
// ============================================

export function StatsClient() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations("stats");

  if (isLoading) return <StatsPageSkeleton />;

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  // TODO: Replace with real data from API
  const GOAL = 20;
  const completed = 1;
  const progress = Math.min((completed / GOAL) * 100, 100);
  const remaining = GOAL - completed;

  const requests = {
    sent: 3,
    received: 5,
    active: 2,
  };

  const reviews = {
    total: 3,
    averageRating: 4.9,
    items: [
      {
        id: "r1",
        author: "Болд Б.",
        rating: 5,
        text: "Маш сайн ажилласан, цаг баримтлсан. Дахин захиална!",
        date: "2025-03-28",
      },
      {
        id: "r2",
        author: "Сараа Д.",
        rating: 5,
        text: "Чанартай үйлчилгээ. Баярлалаа!",
        date: "2025-03-20",
      },
      {
        id: "r3",
        author: "Ганаа Т.",
        rating: 4,
        text: "Ерөнхийдөө сайн, гэхдээ бага зэрэг хоцорсон.",
        date: "2025-03-15",
      },
    ],
  };

  const income = {
    today: 0,
    thisWeek: 50_000,
    thisMonth: 150_000,
  };

  const formatMNT = (amount: number) => amount.toLocaleString("mn-MN") + "₮";

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
                <span className="text-[#015197]">Tsogts</span>
                <span className="text-[#c4272f]">.mn</span>
              </h1>
            </Link>
          </div>
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <NotificationsButton />
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <NotificationsButton />
            <RequestsButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        {/* Page Title */}
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-linear-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <BadgeCheck className="h-6 w-6 md:h-7 md:w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {/* ========== Verification Goal ========== */}
        <div className="rounded-2xl border bg-card p-5 md:p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <BadgeCheck className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-base">{t("verifiedTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("verifiedDesc")}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className="absolute inset-y-0 left-0 bg-linear-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-blue-500">
              {completed}/{GOAL}
            </span>
            <span className="text-muted-foreground">
              {remaining > 0 ? t("remaining", { count: remaining }) : t("goalReached")}
            </span>
          </div>
        </div>

        {/* ========== Requests ========== */}
        <div className="rounded-2xl border bg-card p-5 md:p-6 mb-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
            {t("requests")}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <Send className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{requests.sent}</p>
              <p className="text-[11px] text-muted-foreground">{t("sent")}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <Inbox className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{requests.received}</p>
              <p className="text-[11px] text-muted-foreground">{t("received")}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold">{requests.active}</p>
              <p className="text-[11px] text-muted-foreground">{t("active")}</p>
            </div>
          </div>
        </div>

        {/* ========== Reviews ========== */}
        <ReviewsSection reviews={reviews} t={t} />

        {/* ========== Income ========== */}
        <div className="rounded-2xl border bg-card p-5 md:p-6">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
            {t("income")}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t("today")}</span>
              </div>
              <span className="font-semibold">{formatMNT(income.today)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t("thisWeek")}</span>
              </div>
              <span className="font-semibold">{formatMNT(income.thisWeek)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t("thisMonth")}</span>
              </div>
              <span className="font-semibold text-lg">{formatMNT(income.thisMonth)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
