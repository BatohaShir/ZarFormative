"use server";

/**
 * Server action for changing the selected aimag.
 *
 * Why a server action instead of document.cookie + router.refresh():
 *
 * router.refresh() only revalidates the *current* route segment.
 * That means: user on /services flips the city, current page
 * re-renders — but the cached copy of / in the Client Router Cache
 * stays frozen on the old cookie. When they navigate back, Next.js
 * serves the stale prerender and the grid looks empty / wrong.
 *
 * Server actions can call revalidatePath() for multiple routes in
 * one shot and bust both the Next Data Cache (our unstable_cache
 * slots, tagged per-aimag) and the Client Router Cache. That gives
 * us "pick a city → every surface that cares updates", which is
 * what users expect when a pick feels global.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AIMAG_COOKIE_NAME, AIMAG_COOKIE_MAX_AGE } from "./shared";

export async function setSelectedAimagAction(code: string): Promise<void> {
  const store = await cookies();
  store.set({
    name: AIMAG_COOKIE_NAME,
    value: code,
    maxAge: AIMAG_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  // Bust the Client Router Cache for every route whose SSR reads the
  // aimag cookie. Without this, navigating back to a previously
  // cached page (via the browser's forward/back buttons or a Link)
  // would show the pre-switch grid — the server would hand over the
  // new data but the router cache wouldn't ask for it.
  revalidatePath("/");
  revalidatePath("/services");
}
