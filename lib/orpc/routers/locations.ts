import * as z from "zod";
import { publicProcedure } from "../base";

/**
 * Administrative reference data: aimags → districts → khoroos.
 *
 * Near-static rows that every address picker on the site reads.
 * Public on purpose — the schema allows anonymous reads, and no
 * caller-supplied `where` is accepted: each procedure pins
 * `is_active: true` and orders by `sort_order` server-side.
 *
 * The consumers used to pass full Prisma args (`where`, `orderBy`,
 * `select`) from the browser. They now pass at most a parent id,
 * which is the whole point of the oRPC move: the client can no
 * longer shape the query.
 */
export const locationsRouter = {
  aimags: publicProcedure.handler(async ({ context }) => {
    return context.db.aimags.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    });
  }),

  districts: publicProcedure
    .input(z.object({ aimagId: z.uuid() }))
    .handler(async ({ input, context }) => {
      return context.db.districts.findMany({
        where: { is_active: true, aimag_id: input.aimagId },
        orderBy: { sort_order: "asc" },
      });
    }),

  khoroos: publicProcedure
    .input(z.object({ districtId: z.uuid() }))
    .handler(async ({ input, context }) => {
      return context.db.khoroos.findMany({
        where: { is_active: true, district_id: input.districtId },
        orderBy: { sort_order: "asc" },
      });
    }),
};
