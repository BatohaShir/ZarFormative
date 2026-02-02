"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton компонент для страницы профиля
 *
 * Показывает "заглушки" в форме контента пока данные загружаются.
 * Это улучшает UX - пользователь видит что страница загружается,
 * а не пустой белый экран.
 */
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header Skeleton */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-md" />
            <Skeleton className="h-6 w-32 md:w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Profile Header Skeleton */}
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Avatar Skeleton */}
            <Skeleton className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full" />

            {/* User Info Skeleton */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
              <Skeleton className="h-4 w-32 mx-auto md:mx-0" />

              {/* Stats Skeleton */}
              <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6">
                <Skeleton className="h-10 w-28 rounded-full" />
                <Skeleton className="h-10 w-28 rounded-full" />
                <Skeleton className="h-10 w-28 rounded-full" />
              </div>
            </div>

            {/* Quick Actions Skeleton - Desktop */}
            <div className="hidden lg:flex flex-col gap-2">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-36" />
            </div>
          </div>
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Personal Info Skeleton */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                </div>
              </div>
            </div>

            {/* About Section Skeleton */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {/* Mobile Action Buttons Skeleton */}
            <div className="lg:hidden space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          {/* Right Column - Education & Work Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Education Skeleton */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 bg-muted/30 rounded-lg">
                    <Skeleton className="h-5 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-1" />
                    <Skeleton className="h-4 w-2/5 mt-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Work Experience Skeleton */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 bg-muted/30 rounded-lg">
                    <Skeleton className="h-5 w-2/5 mb-2" />
                    <Skeleton className="h-4 w-1/3 mb-1" />
                    <Skeleton className="h-4 w-2/5 mt-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Компактный skeleton для секции образования/работы
 * Используется при загрузке только этих секций
 */
export function EducationSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
          <Skeleton className="h-5 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-1" />
          <Skeleton className="h-4 w-2/5 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function WorkExperienceSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
          <Skeleton className="h-5 w-2/5 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-1" />
          <Skeleton className="h-4 w-2/5 mt-2" />
        </div>
      ))}
    </div>
  );
}
