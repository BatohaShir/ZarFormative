/**
 * One transparent retry for transient DB errors in SSR fetchers.
 *
 * Vercel iad1 → Supabase ap-northeast-2 has ~200ms RTT and pgbouncer's
 * transaction pool (connection_limit=5) can intermittently refuse a
 * connection during a cold lambda warm-up or when concurrent
 * invocations briefly saturate the pool. A single hiccup would
 * otherwise propagate to the user as error.tsx.
 *
 * Use this around every $queryRaw call in SSR fetchers so most
 * transients are absorbed silently. If both attempts fail we re-throw
 * — the caller's catch block then re-throws to skip unstable_cache
 * writing the failure into the Data Cache.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, backoffMs = 150): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === 0) await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}
