import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-lg" />
            <Skeleton className="h-6 w-32 md:h-8 md:w-40" />
          </div>
          {/* Mobile Nav */}
          <div className="flex md:hidden items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Page Title with Total Count */}
        <div className="flex items-baseline gap-2 mb-4">
          <Skeleton className="h-7 md:h-8 w-36 md:w-44" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Desktop Search & City */}
        <div className="hidden md:flex w-full gap-2 mb-6">
          <Skeleton className="h-11 flex-1 rounded-lg" />
          <Skeleton className="h-11 w-36 rounded-lg" />
        </div>

        {/* Mobile: Search, City, Filters */}
        <div className="md:hidden space-y-3 mb-4">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>

        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-24 border rounded-lg p-4">
              {/* Filter Header */}
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-20" />
              </div>

              <div className="space-y-6">
                {/* Category Filter */}
                <div>
                  <Skeleton className="h-5 w-16 mb-3" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>

                {/* Provider Type Filter */}
                <div>
                  <Skeleton className="h-5 w-20 mb-3" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>

                {/* Price Filter */}
                <div>
                  <Skeleton className="h-5 w-10 mb-3" />
                  <Skeleton className="h-6 w-full rounded-lg mb-2" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>

                {/* Reset Button */}
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Map Section */}
            <Skeleton className="h-50 md:h-70 w-full rounded-xl mb-4" />

            {/* Results header with sort */}
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-36 md:w-44 rounded-lg" />
            </div>

            {/* Listings grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl md:rounded-2xl overflow-hidden border">
                  {/* Image skeleton with overlays */}
                  <div className="aspect-4/3 relative overflow-hidden">
                    <Skeleton className="absolute inset-0" />
                    {/* Category badge skeleton */}
                    <div className="absolute top-2.5 left-2.5 md:top-3 md:left-3">
                      <Skeleton className="h-5 md:h-6 w-16 md:w-20 rounded-full" />
                    </div>
                    {/* Like button skeleton */}
                    <div className="absolute top-2.5 right-2.5 md:top-3 md:right-3">
                      <Skeleton className="w-8 h-8 md:w-9 md:h-9 rounded-full" />
                    </div>
                    {/* Price skeleton */}
                    <div className="absolute bottom-2.5 left-2.5 md:bottom-3 md:left-3">
                      <Skeleton className="h-6 md:h-7 w-24 md:w-28" />
                    </div>
                  </div>
                  {/* Content skeleton */}
                  <div className="p-3 md:p-4 space-y-2 md:space-y-2.5">
                    {/* Title */}
                    <Skeleton className="h-4 md:h-5 w-3/4" />
                    {/* Description */}
                    <Skeleton className="h-3 md:h-4 w-full" />
                    {/* Provider row */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-5 h-5 md:w-6 md:h-6 rounded-full" />
                        <Skeleton className="h-3 md:h-4 w-20" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-8" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                    </div>
                    {/* Location */}
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="w-3.5 h-3.5 rounded" />
                      <Skeleton className="h-3 md:h-4 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
