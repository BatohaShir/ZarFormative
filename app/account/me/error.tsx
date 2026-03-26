"use client";

import { useEffect } from "react";

export default function AccountMeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Account error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-xl font-semibold">Хэрэглэгчийн хуудаст алдаа гарлаа</h2>
      <p className="text-muted-foreground">Уучлаарай, дахин оролдоно уу.</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Дахин оролдох
      </button>
    </div>
  );
}
