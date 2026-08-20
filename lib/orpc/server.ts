import { createRouterClient } from "@orpc/server";
import { appRouter } from "./router";
import { createORPCContext } from "./context";

/**
 * Server-side client for RSC and server actions.
 *
 * `createRouterClient` invokes procedures in-process, so a server
 * component calling `api.locations.aimags()` runs the handler
 * directly — no HTTP request back into the app, no serialization
 * round-trip, and the same code path the browser uses.
 *
 * Context is created lazily per call so each render gets a fresh
 * enhanced Prisma client bound to the current request's user.
 *
 * Server-only by construction: the context reaches for `next/headers`
 * via lib/supabase/server, which throws if imported from a client
 * component. The project doesn't use the `server-only` package
 * anywhere, so we don't add it as a dependency just for this file.
 */
export const api = createRouterClient(appRouter, {
  context: () => createORPCContext(),
});
