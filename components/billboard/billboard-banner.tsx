"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BillboardTracker } from "./billboard-tracker";
import type { Billboard } from "./types";
import { cn } from "@/lib/utils";

interface BillboardBannerProps {
  billboard: Billboard;
  className?: string;
}

export function BillboardBanner({ billboard, className }: BillboardBannerProps) {
  const t = useTranslations("billboard");
  const ref = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  // Track when banner is in viewport
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), {
      threshold: 0.5,
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Delayed reveal: 2s delay to show, 5s visible, then hide
  React.useEffect(() => {
    // Clear previous timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (isInView) {
      // Show text after 2 seconds
      const showTimer = setTimeout(() => setIsVisible(true), 2000);
      // Hide text after 2s + 5s = 7s
      const hideTimer = setTimeout(() => setIsVisible(false), 7000);
      timersRef.current = [showTimer, hideTimer];
    } else {
      setIsVisible(false);
    }

    return () => timersRef.current.forEach(clearTimeout);
  }, [isInView]);

  return (
    <div ref={ref}>
      <BillboardTracker
        billboardId={billboard.id}
        href={billboard.link_url}
        className={cn(
          "block relative group rounded-2xl md:rounded-3xl overflow-hidden border-0 shadow-md hover:shadow-2xl transition-all duration-500",
          className
        )}
      >
        {/* Aspect ratio */}
        <div className="relative aspect-[2.5/1] sm:aspect-3/1 md:aspect-[3.5/1]">
          <Image
            src={billboard.image_url}
            alt={billboard.alt_text || billboard.title}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className={cn(
              "object-cover transition-all duration-700 ease-out",
              "group-hover:scale-105 group-hover:blur-[6px] group-hover:brightness-75",
              isVisible && "scale-105 blur-[6px] brightness-75"
            )}
          />

          {/* Gradient — усиливается при hover/visible */}
          <div
            className={cn(
              "absolute inset-0 transition-all duration-500",
              "bg-linear-to-r from-black/40 via-black/15 to-transparent",
              "group-hover:from-black/70 group-hover:via-black/40 group-hover:to-black/10",
              isVisible && "from-black/70 via-black/40 to-black/10"
            )}
          />

          {/* Shimmer effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full" />

          {/* Dark mode */}
          <div className="absolute inset-0 hidden dark:block bg-black/10 group-hover:bg-black/5 transition-colors duration-500" />

          {/* Text content — hidden by default, revealed on hover (desktop) / scroll (mobile) */}
          <div className="absolute inset-0 flex flex-col justify-center px-5 md:px-10 lg:px-14">
            {/* Title */}
            <h3
              className={cn(
                "text-white font-extrabold text-base sm:text-xl md:text-3xl lg:text-4xl drop-shadow-xl max-w-[80%] md:max-w-[65%] leading-tight",
                "translate-y-4 opacity-0 transition-all duration-500 ease-out",
                "group-hover:translate-y-0 group-hover:opacity-100",
                isVisible && "translate-y-0 opacity-100"
              )}
            >
              {billboard.title}
            </h3>

            {/* Description */}
            {billboard.description && (
              <p
                className={cn(
                  "text-white/90 text-xs sm:text-sm md:text-base mt-1.5 md:mt-3 drop-shadow-md max-w-[75%] md:max-w-[55%] line-clamp-2",
                  "translate-y-4 opacity-0 transition-all duration-500 delay-100 ease-out",
                  "group-hover:translate-y-0 group-hover:opacity-100",
                  isVisible && "translate-y-0 opacity-100"
                )}
              >
                {billboard.description}
              </p>
            )}

            {/* CTA button */}
            <div
              className={cn(
                "mt-2 md:mt-4",
                "translate-y-4 opacity-0 transition-all duration-500 delay-200 ease-out",
                "group-hover:translate-y-0 group-hover:opacity-100",
                isVisible && "translate-y-0 opacity-100"
              )}
            >
              <span className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[11px] sm:text-xs md:text-sm font-semibold px-3 py-1.5 md:px-5 md:py-2.5 rounded-full transition-all duration-300 border border-white/20">
                {t("learnMore")}
                <ArrowRight className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </div>
          </div>

          {/* Ad label — always visible */}
          <div className="absolute top-2.5 right-2.5 md:top-4 md:right-4">
            <span className="text-[9px] md:text-[10px] bg-white/15 backdrop-blur-md text-white/90 px-2 py-1 md:px-2.5 md:py-1 rounded-full font-medium border border-white/10">
              {t("adLabel")}
            </span>
          </div>
        </div>
      </BillboardTracker>
    </div>
  );
}
