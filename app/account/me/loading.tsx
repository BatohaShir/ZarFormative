import { Skeleton } from "@/components/ui/skeleton";
import { InnerHeader } from "@/components/app-header";

export default function MyProfileLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <InnerHeader />

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <Skeleton className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full" />
            <div className="flex-1 text-center md:text-left space-y-4">
              <Skeleton className="h-8 md:h-10 w-48 mx-auto md:mx-0" />
              <Skeleton className="h-4 w-40 mx-auto md:mx-0" />
              <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6">
                <Skeleton className="h-10 w-28 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            </div>
            <div className="hidden lg:flex flex-col gap-2">
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-10 w-44" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <Skeleton className="h-6 w-36 mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {[1, 2].map((s) => (
              <div key={s} className="bg-card rounded-xl border p-4 md:p-6">
                <Skeleton className="h-6 w-28 mb-4" />
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 bg-muted/30 rounded-lg">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
