import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader />

      {/* Hero */}
      <section className="container mx-auto px-4 md:px-6 pt-10 md:pt-20 pb-8 md:pb-14">
        <div className="max-w-3xl mx-auto text-center mb-8 md:mb-12 space-y-3">
          <Skeleton className="h-10 md:h-16 w-72 md:w-140 mx-auto" />
          <Skeleton className="h-10 md:h-16 w-56 md:w-105 mx-auto" />
        </div>

        {/* Unified search bar */}
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row items-stretch bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="flex-1 px-5 py-4">
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="hidden md:block w-px bg-border my-2" />
            <div className="md:hidden h-px bg-border mx-5" />
            <div className="flex items-center px-4 py-3">
              <Skeleton className="h-6 w-28" />
            </div>
            <div className="flex items-center md:m-2">
              <Skeleton className="h-12 md:h-12 w-full md:w-24 md:rounded-xl" />
            </div>
          </div>
          {/* Popular chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </section>

      {/* Stories strip */}
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex gap-3 md:gap-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 w-17 md:w-19 shrink-0">
              <Skeleton className="h-15.5 md:h-17 w-15.5 md:w-17 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Categories — 2×4 compact tiles */}
      <section className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="flex items-end justify-between mb-5 md:mb-6">
          <Skeleton className="h-7 md:h-8 w-28 md:w-32" />
          <Skeleton className="h-4 w-28 hidden md:block" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 md:h-16 rounded-xl" />
          ))}
        </div>
      </section>

      {/* Recommended listings */}
      <section className="container mx-auto px-4 md:px-6 py-8 md:py-14">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <Skeleton className="h-7 md:h-9 w-40 md:w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl overflow-hidden ring-1 ring-border">
              <Skeleton className="aspect-square" />
              <div className="p-3.5 md:p-4 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 md:h-4.5 w-full" />
                <Skeleton className="h-4 md:h-4.5 w-4/5" />
                <Skeleton className="h-6 md:h-7 w-24" />
                <div className="flex items-center justify-between pt-3.5 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-3 w-6" />
                    <Skeleton className="h-3 w-6" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3 w-3 rounded" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
