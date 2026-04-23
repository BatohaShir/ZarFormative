import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-csrf-token",
  "x-supabase-auth",
  "proxy-authorization",
]);

const SENSITIVE_QUERY_KEYS =
  /^(token|access_token|refresh_token|code|secret|password|api[_-]?key|session)$/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._\-+/=]+/gi;

function redactString(value: string): string {
  return value
    .replace(JWT_RE, "[REDACTED_JWT]")
    .replace(BEARER_RE, "Bearer [REDACTED]")
    .replace(EMAIL_RE, "[REDACTED_EMAIL]");
}

function scrubQueryString(qs: string): string {
  try {
    const params = new URLSearchParams(qs);
    for (const key of Array.from(params.keys())) {
      if (SENSITIVE_QUERY_KEYS.test(key)) params.set(key, "[REDACTED]");
    }
    return params.toString();
  } catch {
    return qs;
  }
}

export function scrubSentryEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.request) {
    const req = event.request;

    if (req.headers && typeof req.headers === "object") {
      for (const name of Object.keys(req.headers)) {
        if (SENSITIVE_HEADERS.has(name.toLowerCase())) {
          (req.headers as Record<string, string>)[name] = "[REDACTED]";
        }
      }
    }

    if (typeof req.query_string === "string") {
      req.query_string = scrubQueryString(req.query_string);
    }
    if (typeof req.url === "string") {
      const [path, qs] = req.url.split("?", 2);
      req.url = qs ? `${path}?${scrubQueryString(qs)}` : path;
    }

    if (req.cookies) delete req.cookies;

    if (typeof req.data === "string") {
      req.data = redactString(req.data);
    }
  }

  if (event.message) event.message = redactString(event.message);
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) ex.value = redactString(ex.value);
    }
  }

  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }

  return event;
}
