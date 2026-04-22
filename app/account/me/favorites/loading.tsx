import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";

export default function FavoritesLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader backHref="/" />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="mb-6 md:mb-10 space-y-2">
          <Skeleton className="h-9 md:h-14 w-44 md:w-64" />
          <Skeleton className="h-4 w-40" />
        </div>

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
                    <Skeleton className="h-4.5 w-4.5 rounded-full" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-2.5 w-5" />
                    <Skeleton className="h-2.5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
