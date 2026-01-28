import { Skeleton } from "@/components/ui/skeleton";

export default function CreateListingLoading() {
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

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Page Title */}
        <div className="flex items-center gap-4 mb-6 md:mb-8 max-w-5xl mx-auto">
          <Skeleton className="h-12 w-12 md:h-14 md:w-14 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 md:h-8 w-32 md:w-40" />
            <Skeleton className="h-4 w-48 md:w-64" />
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-5">
          {/* Үндсэн мэдээлэл Section */}
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-muted/30 px-5 py-4 border-b">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Title field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              {/* Description field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Ангилал, Байршил, Үнэ - 3 columns on desktop, stack on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* Category Card */}
            <div className="bg-card rounded-2xl border shadow-sm p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="min-h-10 flex flex-col justify-center gap-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <Skeleton className="h-11 w-full rounded-lg" />
                <div className="py-1.5 h-8 flex items-center justify-center">
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-card rounded-2xl border shadow-sm p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="min-h-10 flex flex-col justify-center gap-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <Skeleton className="h-11 w-full rounded-lg" />
                <div className="py-1.5 h-8 flex items-center justify-center">
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>

            {/* Price Card */}
            <div className="bg-card rounded-2xl border shadow-sm p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="min-h-10 flex flex-col justify-center gap-1.5">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <Skeleton className="h-11 w-full rounded-lg" />
                <div className="py-1.5 h-8 flex items-center justify-center">
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </div>

          {/* Service Type Section */}
          <div className="bg-card rounded-2xl border shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>

          {/* Images Section */}
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-muted/30 px-5 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-7 w-14 rounded-full" />
              </div>
            </div>
            <div className="p-5">
              <Skeleton className="h-40 w-full rounded-xl" />
              <div className="mt-4">
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Buttons Section */}
          <div className="bg-card rounded-2xl border shadow-sm p-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-10 w-full sm:w-24 rounded-lg order-3 sm:order-1" />
              <Skeleton className="h-10 w-full sm:w-40 rounded-lg order-2" />
              <Skeleton className="h-12 flex-1 rounded-lg order-1 sm:order-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
