/**
 * Client-side writer for the selected-aimag cookie.
 *
 * Mirrors the server reader in lib/aimag/cookie.ts. Any surface that
 * lets the user pick a city (hero search's <CitySelect>, the sidebar
 * filter on /services, etc.) should call writeAimagCookie() so the
 * next SSR request sees the same city the user just chose.
 *
 * Kept separate from lib/aimag/cookie.ts because the server helper
 * imports next/headers, which can't be pulled into a client bundle.
 */

import { AIMAG_COOKIE_NAME, AIMAG_COOKIE_MAX_AGE, ALL_AIMAGS_CODE } from "./shared";

/**
 * Write (or reset) the cookie the SSR grid reads. Pass a short aimag
 * code ("UB", "DU") to pin the city, or ALL_AIMAGS_CODE to clear the
 * filter and show listings from everywhere.
 */
export function writeAimagCookie(code: string): void {
  if (typeof document === "undefined") return;
  document.cookie = [
    `${AIMAG_COOKIE_NAME}=${encodeURIComponent(code)}`,
    `max-age=${AIMAG_COOKIE_MAX_AGE}`,
    "path=/",
    "SameSite=Lax",
  ].join(";");
}

/**
 * Read the cookie value from the client. Used by the one-time
 * localStorage → cookie migration so we can decide whether the
 * user's historical choice needs hydrating into the cookie. Returns
 * null when the cookie isn't set (meaning the user is either new or
 * pre-migration).
 */
export function readAimagCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${AIMAG_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export { ALL_AIMAGS_CODE };
