import { Skeleton } from "@/components/ui/skeleton";
import { InnerHeader } from "@/components/app-header";

export default function RequestsLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <InnerHeader />

      <main className="container mx-auto px-4 py-4 md:py-6">
        <Skeleton className="h-7 md:h-8 w-32 mb-4" />
        <Skeleton className="h-10 w-full rounded-md mb-4" />
        <div className="flex justify-center mb-6">
          <Skeleton className="h-10 md:h-11 w-80 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-xl p-3 flex gap-3">
              <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
