import { os, ORPCError } from "@orpc/server";
import type { ORPCContext } from "./context";

/**
 * Base builder carrying the request context. Every router in
 * lib/orpc/routers/* starts from `publicProcedure` or
 * `protectedProcedure` defined here.
 */
export const base = os.$context<ORPCContext>();

/**
 * Anyone may call. The procedure still runs against `ctx.db`, so
 * ZenStack's read rules decide what an anonymous caller can see —
 * e.g. `@@allow('read', status == active && is_active == true)` on
 * listings hides drafts without the procedure spelling that out.
 */
export const publicProcedure = base;

/**
 * Requires a signed-in user. Narrows `context.user` to non-null for
 * downstream handlers, so procedures read `context.user.id` without
 * a null check.
 *
 * This is an authentication gate, not an authorization one:
 * ownership and role checks stay in the schema's policy rules,
 * enforced by the enhanced client behind `context.db`.
 */
export const protectedProcedure = base.use(async ({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      ...context,
      user: context.user,
    },
  });
});
