import { Skeleton } from "@/components/ui/skeleton";
import { InnerHeader } from "@/components/app-header";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-linear-to-b from-muted/30 to-background pb-24 md:pb-8">
      <InnerHeader />

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {Array.from({ length: 4 }).map((_, s) => (
          <section key={s} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="bg-card rounded-2xl border overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            </div>
          </section>
        ))}
        <section className="space-y-3 pt-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
        </section>
      </div>
    </div>
  );
}
