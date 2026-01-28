"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ElapsedTimeCounterProps {
  startedAt: Date | string;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

function formatElapsedTime(startedAt: Date | string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();

  if (diffMs < 0) return "0 мин";

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} мин`;
  }

  if (minutes === 0) {
    return `${hours} цаг`;
  }

  return `${hours} цаг ${minutes} мин`;
}

export function ElapsedTimeCounter({
  startedAt,
  className,
  showIcon = true,
  size = "sm",
}: ElapsedTimeCounterProps) {
  const [elapsed, setElapsed] = React.useState(() => formatElapsedTime(startedAt));

  React.useEffect(() => {
    // Update immediately
    setElapsed(formatElapsedTime(startedAt));

    // Update every minute
    const interval = setInterval(() => {
      setElapsed(formatElapsedTime(startedAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [startedAt]);

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Clock className={cn(iconSizes[size], "animate-pulse")} />}
      <span>{elapsed}</span>
    </div>
  );
}
