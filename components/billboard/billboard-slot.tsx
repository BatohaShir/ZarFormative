"use client";

import { BillboardCarousel } from "./billboard-carousel";
import { BillboardCard } from "./billboard-card";
import { getMockBillboards } from "./mock-data";
import type { BillboardPlacement } from "./types";
import { cn } from "@/lib/utils";

interface BillboardSlotProps {
  placement: BillboardPlacement;
  className?: string;
}

export function BillboardSlot({ placement, className }: BillboardSlotProps) {
  // TODO: Replace with real data fetching when DB models are ready
  const billboards = getMockBillboards(placement);

  if (billboards.length === 0) return null;

  // Inline cards don't use carousel
  if (billboards[0].size === "card") {
    return <BillboardCard billboard={billboards[0]} />;
  }

  return (
    <div className={cn("container mx-auto px-4 py-3 md:py-4", className)}>
      <BillboardCarousel billboards={billboards} />
    </div>
  );
}
