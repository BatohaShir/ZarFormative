/**
 * Active-aimag list for the header selector.
 *
 * Aimags are a tiny reference table that almost never changes, so we
 * cache the result for 24h via unstable_cache. The header renders on
 * every route, so one DB hit per day per region is the right ceiling.
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface AimagListItem {
  id: string;
  code: string;
  name: string;
  type: "aimag" | "capital";
}

export const getAimagList = unstable_cache(
  async (): Promise<AimagListItem[]> => {
    const rows = await prisma.aimags.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
      orderBy: [
        // type DESC so "capital" (Улаанбаатар) comes before "aimag" —
        // c > a in ascending, so we flip to desc. Then the canonical
        // sort_order for provinces.
        { type: "desc" },
        { sort_order: "asc" },
        { name: "asc" },
      ],
    });
    return rows as AimagListItem[];
  },
  ["aimag-list"],
  { revalidate: 60 * 60 * 24, tags: ["aimags"] }
);
