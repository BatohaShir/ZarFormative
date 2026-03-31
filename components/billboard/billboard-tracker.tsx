"use client";

import * as React from "react";

interface BillboardTrackerProps {
  billboardId: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function BillboardTracker({
  billboardId,
  href,
  children,
  className,
}: BillboardTrackerProps) {
  const ref = React.useRef<HTMLAnchorElement>(null);
  const tracked = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          // TODO: POST /api/billboards/[id]/track { event_type: "impression" }
          console.log(`[Billboard] Impression: ${billboardId}`);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [billboardId]);

  const handleClick = () => {
    // TODO: POST /api/billboards/[id]/track { event_type: "click" }
    console.log(`[Billboard] Click: ${billboardId}`);
  };

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}
