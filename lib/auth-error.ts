/**
 * Translate a raw Supabase/auth error message into a user-friendly
 * localized string. Supabase returns messages in English by default
 * ("Invalid login credentials", "User already registered", etc.) and
 * we'd rather not surface those verbatim to Mongolian/Russian users.
 *
 * The matching is substring-based because Supabase sometimes appends
 * extra context to the same error family. When nothing matches we
 * fall back to a generic "something went wrong" so a copy-pasted
 * stack trace never leaks to the UI.
 */
export function translateAuthError(
  raw: string | null | undefined,
  t: (key: string) => string
): string {
  if (!raw) return t("auth.errorGeneric");

  const s = raw.toLowerCase();

  if (s.includes("invalid login credentials") || s.includes("invalid credentials")) {
    return t("auth.invalidCredentials");
  }
  if (s.includes("email not confirmed") || s.includes("confirm your email")) {
    return t("auth.errorEmailNotConfirmed");
  }
  if (s.includes("user already registered") || s.includes("already exists")) {
    return t("auth.errorUserAlreadyExists");
  }
  if (s.includes("too many requests") || s.includes("rate limit")) {
    return t("auth.errorTooManyRequests");
  }
  if (s.includes("network") || s.includes("fetch failed") || s.includes("failed to fetch")) {
    return t("auth.errorNetwork");
  }
  if (s.includes("weak password") || s.includes("password should be")) {
    return t("auth.errorWeakPassword");
  }
  if (s.includes("invalid email") || s.includes("unable to validate email")) {
    return t("auth.errorInvalidEmail");
  }
  if (s.includes("user not found") || s.includes("no user found")) {
    return t("auth.errorUserNotFound");
  }

  return t("auth.errorGeneric");
}
