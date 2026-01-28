import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeletonGrid } from "@/components/listing-card-skeleton";

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
            <ListingCardSkeletonGrid count={8} />
          </div>
        </div>
      </div>
    </div>
  );
}
