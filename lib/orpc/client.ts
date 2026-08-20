"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "./router";

/**
 * Browser-side oRPC client + TanStack Query bindings.
 *
 * `credentials: "include"` matches what the old QueryProvider did
 * for the generated ZenStack hooks — Supabase's session lives in an
 * httpOnly cookie, so procedures would see an anonymous caller
 * without it.
 *
 * Query keys come from `orpc.<path>.key()` / `.queryKey()`. This
 * matters for the realtime hooks: they used to invalidate the
 * hardcoded `["zenstack", <model>, "findMany"]` keys, and a key that
 * no longer matches fails *silently* — invalidateQueries simply does
 * nothing. Each realtime hook is therefore migrated in the same
 * commit as its domain, never later.
 */
const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error("orpc client is browser-only; use lib/orpc/server.ts on the server");
    }
    return new URL("/api/orpc", window.location.origin);
  },
  fetch: (request, init) => globalThis.fetch(request, { ...init, credentials: "include" }),
});

export const client: RouterClient<AppRouter> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
