"use client";

import * as React from "react";
import Image from "next/image";
import { Megaphone, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BillboardTracker } from "./billboard-tracker";
import type { Billboard } from "./types";
import { cn } from "@/lib/utils";

interface BillboardCardProps {
  billboard: Billboard;
  priority?: boolean;
}

export function BillboardCard({ billboard, priority = false }: BillboardCardProps) {
  const t = useTranslations("billboard");
  const ref = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  // Track when card is in viewport
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
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (isInView) {
      const showTimer = setTimeout(() => setIsVisible(true), 2000);
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
        className="cursor-pointer group relative bg-card rounded-xl md:rounded-2xl overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-500"
      >
        {/* Image — matches ListingCard aspect ratio */}
        <div className="aspect-4/3 relative overflow-hidden">
          <Image
            src={billboard.image_url}
            alt={billboard.alt_text || billboard.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className={cn(
              "object-cover transition-all duration-700 ease-out",
              "group-hover:scale-110 group-hover:blur-xs group-hover:brightness-75",
              isVisible && "scale-110 blur-xs brightness-75"
            )}
          />

          {/* Gradient — усиливается при hover/visible */}
          <div
            className={cn(
              "absolute inset-0 transition-all duration-500",
              "bg-linear-to-t from-black/50 via-transparent to-transparent",
              "group-hover:from-black/80 group-hover:via-black/30 group-hover:to-black/5",
              isVisible && "from-black/80 via-black/30 to-black/5"
            )}
          />

          {/* Dark mode */}
          <div className="absolute inset-0 hidden dark:block bg-black/10" />

          {/* Ad badge */}
          <div className="absolute top-2.5 left-2.5 md:top-3 md:left-3">
            <span className="text-[10px] md:text-xs bg-amber-500 text-white px-2.5 py-1 md:px-3 md:py-1.5 rounded-full font-semibold shadow-lg backdrop-blur-sm flex items-center gap-1">
              <Megaphone className="w-3 h-3" />
              {t("adLabel")}
            </span>
          </div>

          {/* Text overlay — revealed on hover/scroll */}
          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
            <p
              className={cn(
                "text-white font-bold text-sm md:text-base drop-shadow-xl line-clamp-2",
                "translate-y-2 opacity-0 transition-all duration-400 ease-out",
                "group-hover:translate-y-0 group-hover:opacity-100",
                isVisible && "translate-y-0 opacity-100"
              )}
            >
              {billboard.title}
            </p>
            {billboard.description && (
              <p
                className={cn(
                  "text-white/85 text-[10px] md:text-xs mt-1 drop-shadow-md line-clamp-1",
                  "translate-y-2 opacity-0 transition-all duration-400 delay-75 ease-out",
                  "group-hover:translate-y-0 group-hover:opacity-100",
                  isVisible && "translate-y-0 opacity-100"
                )}
              >
                {billboard.description}
              </p>
            )}
            <div
              className={cn(
                "flex items-center gap-1 mt-1.5",
                "translate-y-2 opacity-0 transition-all duration-400 delay-150 ease-out",
                "group-hover:translate-y-0 group-hover:opacity-100",
                isVisible && "translate-y-0 opacity-100"
              )}
            >
              <span className="text-[10px] md:text-xs text-white/90 font-medium">
                {t("learnMore")}
              </span>
              <ArrowRight className="w-3 h-3 text-white/90 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </BillboardTracker>
    </div>
  );
}
