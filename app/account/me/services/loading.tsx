import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";

export default function MyServicesLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader backHref="/" />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Editorial title + CTA */}
        <div className="flex items-end justify-between gap-3 mb-6 md:mb-8">
          <div className="space-y-2 min-w-0">
            <Skeleton className="h-9 md:h-14 w-44 md:w-64" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 md:h-11 w-12 md:w-36 rounded-full shrink-0" />
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <Skeleton className="h-10 md:h-11 w-full rounded-full" />
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl overflow-hidden ring-1 ring-border">
              <Skeleton className="aspect-square" />
              <div className="p-2.5 md:p-3 space-y-1.5">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-5 w-20" />
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-2.5 w-5" />
                    <Skeleton className="h-2.5 w-5" />
                  </div>
                  <Skeleton className="h-2.5 w-16" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-6 w-6 rounded-lg" />
                    <Skeleton className="h-6 w-6 rounded-lg" />
                  </div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              </div>
              <div className="border-t border-border px-3 py-2">
                <Skeleton className="h-6 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
