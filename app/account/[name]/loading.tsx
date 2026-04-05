import { Skeleton } from "@/components/ui/skeleton";
import { InnerHeader } from "@/components/app-header";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <InnerHeader />

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <Skeleton className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full" />
            <div className="flex-1 text-center md:text-left space-y-4">
              <Skeleton className="h-8 md:h-10 w-48 mx-auto md:mx-0" />
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
                <Skeleton className="h-10 w-28 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <Skeleton className="h-6 w-20 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border rounded-xl overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <Skeleton className="h-6 w-28 mb-4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
