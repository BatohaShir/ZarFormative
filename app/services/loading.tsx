import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 flex-1 max-w-md" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar skeleton (desktop) */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="space-y-6">
              <div>
                <Skeleton className="h-5 w-20 mb-3" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-5 w-24 mb-3" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </div>
              <div>
                <Skeleton className="h-5 w-16 mb-3" />
                <Skeleton className="h-6 w-full" />
                <div className="flex justify-between mt-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          </aside>

          {/* Main content skeleton */}
          <main className="flex-1">
            {/* Mobile filters */}
            <div className="lg:hidden mb-4">
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-28" />
            </div>

            {/* Listings grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border bg-card">
                  <Skeleton className="aspect-4/3" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex items-center gap-2 mt-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
