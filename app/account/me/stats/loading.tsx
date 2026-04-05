import { Skeleton } from "@/components/ui/skeleton";
import { InnerHeader } from "@/components/app-header";

export default function StatsLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <InnerHeader />

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <Skeleton className="h-12 w-12 md:h-14 md:w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 md:h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 md:p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-3 w-full rounded-full mb-3" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 md:p-6 mb-4">
          <Skeleton className="h-4 w-20 mb-4" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="w-10 h-10 rounded-full mx-auto mb-2" />
                <Skeleton className="h-7 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 md:p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 md:p-6">
          <Skeleton className="h-4 w-16 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-24" />
                </div>
                {i < 2 && <div className="h-px bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
