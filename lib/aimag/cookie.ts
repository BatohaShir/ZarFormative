/**
 * Server-side reader for the selected-aimag cookie.
 *
 * The home page and /services both call this during SSR so the
 * listings grid can be filtered to the user's chosen city. The
 * cookie is written on the client by writeAimagCookie() in
 * lib/aimag/cookie-client.ts; constants are shared via
 * lib/aimag/shared.ts so they can't drift between the two sides.
 *
 * Returns ALL_AIMAGS_CODE ("ALL") when no cookie is present — the
 * home page CTE treats that as a no-op on the aimag filter and
 * shows listings from every city.
 */

import { cookies } from "next/headers";
import { AIMAG_COOKIE_NAME, ALL_AIMAGS_CODE } from "./shared";

export { AIMAG_COOKIE_NAME, ALL_AIMAGS_CODE };

export async function getSelectedAimagCode(): Promise<string> {
  const store = await cookies();
  return store.get(AIMAG_COOKIE_NAME)?.value || ALL_AIMAGS_CODE;
}
