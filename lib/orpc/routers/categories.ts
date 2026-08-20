import { publicProcedure } from "../base";

/**
 * Service categories. Like locations, this is public reference data
 * read by the category pickers and filter modals; the schema's read
 * rule is what allows anonymous access.
 */
export const categoriesRouter = {
  list: publicProcedure.handler(async ({ context }) => {
    return context.db.categories.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    });
  }),
};
