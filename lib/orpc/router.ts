import { locationsRouter } from "./routers/locations";
import { categoriesRouter } from "./routers/categories";
import { favoritesRouter } from "./routers/favorites";

/**
 * Root router — the single surface the browser talks to.
 *
 * Domains are added here as the ZenStack migration progresses; see
 * ORPC_MIGRATION.md for the staged order. Until a domain lands, its
 * consumers keep using the generated hooks, so the app stays
 * runnable at every step.
 */
export const appRouter = {
  locations: locationsRouter,
  categories: categoriesRouter,
  favorites: favoritesRouter,
};

export type AppRouter = typeof appRouter;
