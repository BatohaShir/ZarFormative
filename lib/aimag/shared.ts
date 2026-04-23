/**
 * Single source of truth for the selected-aimag cookie.
 *
 * Both the SSR reader (lib/aimag/cookie.ts) and the client writer
 * (lib/aimag/cookie-client.ts) import the constants from here. If
 * you rename the cookie or change the TTL, this is the only file
 * that needs editing.
 *
 * Server ⇄ client contract:
 *   * Client writes cookie value = short aimag code (e.g. "UB", "DU")
 *     or the ALL_AIMAGS_CODE sentinel for "don't filter".
 *   * Server reads the cookie and joins against aimags.code.
 */

export const AIMAG_COOKIE_NAME = "selected_aimag";
export const AIMAG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
export const ALL_AIMAGS_CODE = "ALL";
