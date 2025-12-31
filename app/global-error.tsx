"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "20px",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Алдаа гарлаа</h2>
          <p style={{ marginBottom: "24px", color: "#666" }}>
            Уучлаарай, ямар нэг зүйл буруу болсон байна.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Дахин оролдох
          </button>
        </div>
      </body>
    </html>
  );
}
