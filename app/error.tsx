"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error caught by boundary:", error);

    // TODO: Send to Sentry or other error tracking service
    // Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Алдаа гарлаа</h2>
          <p className="text-muted-foreground">
            Уучлаарай, ямар нэг зүйл буруу болсон байна. Дахин оролдоно уу.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="p-4 bg-muted rounded-lg text-left">
            <p className="text-sm font-mono text-red-600 dark:text-red-400">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={() => reset()} variant="default">
            Дахин оролдох
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            Нүүр хуудас руу буцах
          </Button>
        </div>
      </div>
    </div>
  );
}
