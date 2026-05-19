import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of the `Authorization: Bearer <secret>`
 * header against `CRON_SECRET`. Plain `===` on secrets leaks the
 * matching-prefix length through response-time differences, which
 * over many calls is enough to recover the secret one byte at a
 * time. `timingSafeEqual` short-circuits only on length, which we
 * neutralise by comparing buffers of the same length below.
 *
 * Returns true if the request is authorised, false otherwise.
 * In dev (no CRON_SECRET set) we allow the request through so the
 * endpoint stays callable from a local terminal — same behaviour
 * the previous inline check had.
 */
export function isAuthorizedCron(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // Dev: no secret configured → allow (was the prior behaviour).
  if (process.env.NODE_ENV !== "production" && !cronSecret) {
    return true;
  }

  // Prod: secret must be configured.
  if (!cronSecret) return false;
  if (!authHeader) return false;

  const expected = `Bearer ${cronSecret}`;
  // timingSafeEqual throws on length mismatch — pad both sides to a
  // common length so the failure mode is also constant-time.
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still do a comparison of equal-length buffers so an attacker
    // can't distinguish "wrong length" from "wrong bytes" by timing.
    timingSafeEqual(Buffer.alloc(b.length), b);
    return false;
  }
  return timingSafeEqual(a, b);
}
