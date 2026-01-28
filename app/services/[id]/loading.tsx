import { Skeleton } from "@/components/ui/skeleton";

export default function ServiceDetailLoading() {
  return (
    <div className="min-h-screen bg-background pb-32 md:pb-20 lg:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-lg" />
            <Skeleton className="h-6 w-32 hidden sm:block" />
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

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 pb-24 lg:pb-6">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Main Image */}
            <div className="relative aspect-video rounded-xl md:rounded-2xl overflow-hidden">
              <Skeleton className="absolute inset-0" />
              {/* Category badge */}
              <div className="absolute top-2 left-2 md:top-4 md:left-4">
                <Skeleton className="h-6 md:h-8 w-20 md:w-28 rounded-full" />
              </div>
            </div>

            {/* Share & Like Buttons */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>

            {/* Title & Price */}
            <div className="space-y-2">
              <Skeleton className="h-6 md:h-8 w-3/4" />
              <Skeleton className="h-8 md:h-10 w-36" />
            </div>

            {/* Location & Views */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>

            {/* Mobile Provider Card */}
            <div className="lg:hidden">
              <div className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 md:space-y-3">
              <Skeleton className="h-5 md:h-6 w-28" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {/* Mobile Reviews */}
            <div className="lg:hidden space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="border rounded-xl p-4">
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>

          {/* Right Column - Provider Info (Desktop only) */}
          <div className="hidden lg:block space-y-4">
            <div className="sticky top-24">
              {/* Provider Card */}
              <div className="border rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <Skeleton className="h-11 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>

              {/* Reviews Section */}
              <div className="border rounded-2xl p-6 mt-4 space-y-4">
                <Skeleton className="h-5 w-28" />
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background border-t p-3 z-40">
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
