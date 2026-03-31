"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BillboardBanner } from "./billboard-banner";
import type { Billboard } from "./types";
import { cn } from "@/lib/utils";

const AUTO_PLAY_INTERVAL = 10_000; // 10 seconds

interface BillboardCarouselProps {
  billboards: Billboard[];
  className?: string;
}

export function BillboardCarousel({ billboards, className }: BillboardCarouselProps) {
  const [current, setCurrent] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const total = billboards.length;

  // Auto-play
  React.useEffect(() => {
    if (isPaused || total <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [isPaused, total]);

  const goTo = React.useCallback(
    (index: number) => {
      setCurrent(((index % total) + total) % total);
    },
    [total]
  );

  const prev = React.useCallback(() => goTo(current - 1), [goTo, current]);
  const next = React.useCallback(() => goTo(current + 1), [goTo, current]);

  if (total === 0) return null;

  return (
    <div
      className={cn("relative group/carousel", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <div className="overflow-hidden rounded-2xl md:rounded-3xl">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {billboards.map((billboard) => (
            <div key={billboard.id} className="w-full shrink-0">
              <BillboardBanner billboard={billboard} className="rounded-none" />
            </div>
          ))}
        </div>
      </div>

      {/* Arrow buttons — visible on hover */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {total > 1 && (
        <div className="absolute bottom-2.5 md:bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 md:gap-2">
          {billboards.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={cn(
                "transition-all duration-300 rounded-full",
                index === current
                  ? "w-6 md:w-8 h-2 md:h-2.5 bg-white"
                  : "w-2 md:w-2.5 h-2 md:h-2.5 bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {total > 1 && !isPaused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 rounded-b-2xl md:rounded-b-3xl overflow-hidden">
          <div
            className="h-full bg-white/50 rounded-full"
            style={{
              animation: `billboard-progress ${AUTO_PLAY_INTERVAL}ms linear`,
              animationIterationCount: 1,
            }}
            key={current}
          />
        </div>
      )}
    </div>
  );
}
