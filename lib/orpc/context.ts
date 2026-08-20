import { getEnhancedPrisma } from "@/prisma/enhanced";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { PrismaClient } from "@prisma/client";

/**
 * Request-scoped context for every oRPC procedure.
 *
 * `db` is the ZenStack-enhanced Prisma client. This is the single
 * most important line in the oRPC layer: `enhance()` folds the 78
 * `@@allow`/`@@deny` rules from schema.zmodel into every query it
 * runs, so a procedure that forgets a `where` clause still cannot
 * leak another user's rows.
 *
 * That is why the migration to oRPC keeps ZenStack as a runtime
 * guard while dropping it as a transport. Nothing outside this file
 * (and prisma/enhanced.ts) imports ZenStack any more — the generated
 * REST route and the ~10k lines of generated hooks are gone — but
 * the policy layer they used to carry is still enforced here.
 *
 * INVARIANT: procedures talk to the database through `ctx.db`, never
 * through the raw `prisma` import. The one deliberate exception is
 * `requests.transition`, which is a trusted boundary that must be
 * able to write `status` — a field the schema denies to everyone
 * else. That exception is documented at its call site.
 */
export interface ORPCContext {
  db: PrismaClient;
  user: User | null;
}

export async function createORPCContext(): Promise<ORPCContext> {
  const supabase = await createClient();

  // middleware has already refreshed the session, so getUser() both
  // verifies the JWT and avoids a second network hop here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // getEnhancedPrisma() re-reads the Supabase user internally to
  // build its policy context. Calling it after getUser() keeps the
  // two views of "who is this" consistent within one request.
  const db = (await getEnhancedPrisma()) as unknown as PrismaClient;

  return { db, user };
}
