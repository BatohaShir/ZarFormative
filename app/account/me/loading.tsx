import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";

export default function MyProfileLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader backHref="/" />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Profile header — editorial */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
            {/* Avatar */}
            <Skeleton className="w-28 h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full shrink-0" />

            {/* Name + email + stats */}
            <div className="flex-1 text-center md:text-left space-y-3 min-w-0 w-full">
              <Skeleton className="h-9 md:h-12 w-56 md:w-72 mx-auto md:mx-0" />
              <Skeleton className="h-4 w-40 mx-auto md:mx-0" />
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            </div>

            {/* Desktop quick actions — 4 pills */}
            <div className="hidden lg:flex flex-col gap-2 shrink-0">
              <Skeleton className="h-10 w-44 rounded-full" />
              <Skeleton className="h-10 w-44 rounded-full" />
              <Skeleton className="h-10 w-44 rounded-full" />
              <Skeleton className="h-10 w-44 rounded-full" />
            </div>
          </div>
        </div>

        {/* Mobile actions — 2×2 pills */}
        <div className="lg:hidden grid grid-cols-2 gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 rounded-full" />
          ))}
        </div>

        {/* Verification Goal */}
        <div className="rounded-2xl ring-1 ring-border bg-card p-5 md:p-6 mb-6 md:mb-8">
          <div className="flex items-start gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full mb-3" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left column — Personal Info + About */}
          <div className="lg:col-span-1 space-y-6">
            {/* Personal Info card */}
            <div className="bg-card rounded-2xl ring-1 ring-border p-4 md:p-6">
              {/* Section title with icon */}
              <div className="flex items-center gap-2 mb-5">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-32" />
              </div>

              {/* 4 info rows: icon + (label + value) */}
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* About card — title row + edit button + body */}
            <div className="bg-card rounded-2xl ring-1 ring-border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            </div>
          </div>

          {/* Right column — Education + Work */}
          <div className="lg:col-span-2 space-y-6">
            {/* Education card */}
            <div className="bg-card rounded-2xl ring-1 ring-border p-4 md:p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-28" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 bg-muted/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-5 w-48" />
                      <div className="flex items-center gap-1 shrink-0">
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-40" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Work Experience card */}
            <div className="bg-card rounded-2xl ring-1 ring-border p-4 md:p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 bg-muted/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-5 w-56" />
                      <div className="flex items-center gap-1 shrink-0">
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-44" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
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
