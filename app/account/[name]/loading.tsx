import { Skeleton } from "@/components/ui/skeleton";
import { InnerHeader } from "@/components/app-header";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <InnerHeader />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Profile header */}
        <div className="bg-card rounded-2xl ring-1 ring-border p-5 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-8">
            <Skeleton className="w-28 h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full self-center md:self-start shrink-0" />
            <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
              <Skeleton className="h-8 md:h-10 lg:h-11 w-3/4 max-w-sm mx-auto md:mx-0" />
              <Skeleton className="h-4 w-40 mx-auto md:mx-0" />
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                <Skeleton className="h-8 w-44 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Main single-column flow */}
        <div className="space-y-6 md:space-y-8">
          {/* About */}
          <section>
            <Skeleton className="h-6 md:h-7 w-24 mb-3 md:mb-4" />
            <div className="bg-card rounded-2xl ring-1 ring-border p-5 md:p-6 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </section>

          {/* Services */}
          <section>
            <Skeleton className="h-6 md:h-7 w-40 mb-3 md:mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-full flex-col rounded-2xl overflow-hidden bg-card ring-1 ring-border"
                >
                  <Skeleton className="aspect-square" />
                  <div className="flex flex-1 flex-col p-3.5 md:p-4 space-y-2">
                    <div className="space-y-1">
                      <Skeleton className="h-2.5 w-14" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                    <div className="mt-auto pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5 pt-2">
                        <Skeleton className="h-3 w-3" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Education + Work — 2 cols on desktop */}
          <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
            <section>
              <Skeleton className="h-6 md:h-7 w-32 mb-3 md:mb-4" />
              <div className="bg-card rounded-2xl ring-1 ring-border p-4 md:p-6 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-muted/30 p-4 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            </section>
            <section>
              <Skeleton className="h-6 md:h-7 w-40 mb-3 md:mb-4" />
              <div className="bg-card rounded-2xl ring-1 ring-border p-4 md:p-6 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-muted/30 p-4 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Reviews */}
          <section>
            <Skeleton className="h-6 md:h-7 w-32 mb-3 md:mb-4" />
            <div className="bg-card rounded-2xl ring-1 ring-border p-4 md:p-6">
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
