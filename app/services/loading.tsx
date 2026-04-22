import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeletonGrid } from "@/components/listing-card-skeleton";
import { SiteHeader } from "@/components/site-header";

export default function ServicesLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader backHref="/" />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Editorial page header */}
        <div className="mb-6 md:mb-8 space-y-2">
          <Skeleton className="h-9 md:h-14 w-64 md:w-96" />
          <Skeleton className="h-4 w-28" />
        </div>

        {/* Desktop Search & City */}
        <div className="hidden md:flex w-full gap-2 mb-8">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-44 rounded-md" />
        </div>

        {/* Mobile controls */}
        <div className="md:hidden space-y-2.5 mb-5">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        <div className="flex gap-8 md:gap-10">
          {/* Desktop Filters Sidebar — editorial, no box */}
          <aside className="hidden md:block w-60 shrink-0">
            <div className="sticky top-24 space-y-6">
              <Skeleton className="h-6 w-24" />

              <div className="space-y-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>

              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1">
            {/* Billboard */}
            <Skeleton className="aspect-[2.5/1] sm:aspect-3/1 md:aspect-[3.5/1] w-full rounded-2xl md:rounded-3xl mb-5" />

            {/* Map */}
            <div className="mb-6 rounded-2xl overflow-hidden ring-1 ring-border">
              <Skeleton className="h-50 md:h-70 w-full rounded-none" />
            </div>

            {/* Results header */}
            <div className="flex items-end justify-between mb-5 md:mb-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-36 md:w-44 rounded-full" />
            </div>

            {/* Grid */}
            <ListingCardSkeletonGrid count={8} />
          </div>
        </div>
      </div>
    </div>
  );
}
