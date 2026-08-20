import * as z from "zod";
import { protectedProcedure } from "../base";

/**
 * User favourites.
 *
 * Every procedure here is owner-scoped by construction: the
 * `user_id` filter comes from `context.user.id`, never from the
 * caller. The generated ZenStack hooks used to accept a full
 * Prisma `where` from the browser and relied on the schema's
 * @@allow rules to reject anything out of bounds; pinning it
 * server-side removes that class of mistake entirely.
 *
 * The enhanced client behind `context.db` still applies those
 * rules as a second layer — see lib/orpc/context.ts.
 */

/** Shape the /favorites grid needs. Mirrors the SSR CTE in lib/favorites/query.ts. */
const FULL_SELECT = {
  id: true,
  listing_id: true,
  user_id: true,
  created_at: true,
  listing: {
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      price: true,
      currency: true,
      is_negotiable: true,
      views_count: true,
      favorites_count: true,
      category: { select: { id: true, name: true, slug: true } },
      aimag: { select: { id: true, name: true } },
      images: {
        where: { is_cover: true },
        take: 1,
        select: { id: true, url: true },
      },
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          avatar_url: true,
          is_verified: true,
        },
      },
    },
  },
} as const;

/**
 * Only active listings surface. Without this an archived or
 * deactivated listing would pop back into the grid the moment
 * React Query refetched, diverging from what SSR rendered.
 */
const ACTIVE_LISTING = { is: { status: "active", is_active: true } } as const;

export const favoritesRouter = {
  /**
   * Minimal shape for the header count and the per-card
   * `isFavorite` lookup. Deliberately two columns — this rides on
   * every page, and the full payload is ~5KB versus ~200 bytes.
   */
  ids: protectedProcedure.handler(async ({ context }) => {
    return context.db.user_favorites.findMany({
      where: { user_id: context.user.id, listing: ACTIVE_LISTING },
      select: { id: true, listing_id: true },
      orderBy: { created_at: "desc" },
    });
  }),

  /** Full rows, fetched only by /account/me/favorites. */
  list: protectedProcedure.handler(async ({ context }) => {
    return context.db.user_favorites.findMany({
      where: { user_id: context.user.id, listing: ACTIVE_LISTING },
      select: FULL_SELECT,
      orderBy: { created_at: "desc" },
    });
  }),

  add: protectedProcedure
    .input(z.object({ listingId: z.uuid() }))
    .handler(async ({ input, context }) => {
      return context.db.user_favorites.create({
        data: { user_id: context.user.id, listing_id: input.listingId },
        select: { id: true, listing_id: true },
      });
    }),

  /**
   * Removal is by listing, not by favourite id. The client knows
   * which card was tapped; making it look up the row id first was
   * an extra round-trip and a chance to delete the wrong row.
   * deleteMany + the user_id filter means a caller cannot remove
   * somebody else's favourite even by guessing ids.
   */
  remove: protectedProcedure
    .input(z.object({ listingId: z.uuid() }))
    .handler(async ({ input, context }) => {
      await context.db.user_favorites.deleteMany({
        where: { user_id: context.user.id, listing_id: input.listingId },
      });
      return { listingId: input.listingId };
    }),
};
