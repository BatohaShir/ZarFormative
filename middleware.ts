import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isDev = process.env.NODE_ENV === "development";

// Allowed origins for CSRF protection (localhost only in development).
// In production we *also* accept the request's own host as same-origin —
// otherwise a missing NEXT_PUBLIC_SITE_URL env var (or a Vercel
// preview deploy on a different vercel.app subdomain) silently 403s
// every Server Action while the page itself still loads via GET. The
// CSRF guarantee is "browser refuses to send Origin from anywhere
// other than the document's own origin", so allowing the document's
// origin is the actual baseline; this list is for cross-origin
// allow-listing on top of that.
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXTAUTH_URL,
  ...(isDev ? ["http://localhost:3000", "http://localhost:3001"] : []),
].filter(Boolean) as string[];

/**
 * CSRF Protection: Validate Origin header on state-changing requests.
 * Returns an error response if origin is not allowed, or null if OK.
 */
function validateOrigin(request: NextRequest): NextResponse | null {
  const method = request.method;

  // Only check state-changing methods
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  // Skip for API routes called by cron (use Bearer auth instead)
  if (request.nextUrl.pathname.startsWith("/api/cron/")) {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // If no origin header (same-origin fetch in some browsers), check referer
  const checkUrl = origin || (referer ? new URL(referer).origin : null);

  if (!checkUrl) {
    // No origin or referer — could be server-to-server, allow if not browser
    // Browsers always send origin on POST/PUT/PATCH/DELETE
    return null;
  }

  // Same-origin: the request's Origin header matches the host the
  // request came in on. This is the natural "I'm on my own site"
  // case — CSRF attacks rely on Origin pointing AT US from somewhere
  // ELSE, so accepting our own host is safe regardless of env config.
  const requestHost = request.headers.get("host");
  const requestProto = request.headers.get("x-forwarded-proto") || "https";
  const sameOrigin = requestHost ? `${requestProto}://${requestHost}` === checkUrl : false;

  const isAllowed = sameOrigin || ALLOWED_ORIGINS.some((allowed) => checkUrl === allowed);
  if (!isAllowed) {
    return NextResponse.json(
      { error: "CSRF validation failed: origin not allowed" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Add the Content Security Policy header.
 *
 * The other security headers (X-Content-Type-Options, X-Frame-Options,
 * Referrer-Policy, Permissions-Policy, HSTS) are emitted from
 * `next.config.ts#headers()`, which applies to ALL responses including
 * /api/* and static assets — middleware's matcher would skip those.
 * We keep CSP here because it depends on runtime env (Supabase URL)
 * which `next.config.ts` can't read per-request.
 *
 * `report-uri` points at the same `/monitoring` rewrite that Sentry's
 * `tunnelRoute` uses, so violations land in the existing Sentry project
 * without requiring a separate collector. Browsers that only speak the
 * newer `report-to` directive will ignore `report-uri`; we don't ship a
 * `Reporting-Endpoints` header yet because Sentry's tunnel doesn't
 * implement the report-to spec.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  // CSP: tighter in production (no unsafe-eval), relaxed in dev for Next.js hot reload
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
    : `script-src 'self' 'unsafe-inline'`; // Production: no unsafe-eval

  const csp = [
    "default-src 'self'",
    scriptSrc,
    `style-src 'self' 'unsafe-inline'`, // Tailwind uses inline styles
    `img-src 'self' data: blob: ${supabaseUrl} https://api.dicebear.com https://*.supabase.co https://*.tile.openstreetmap.org`,
    `font-src 'self'`,
    `connect-src 'self' ${supabaseUrl} https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://router.project-osrm.org`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `report-uri /monitoring`,
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  // X-XSS-Protection is legacy (Chromium / Edge removed it; modern
  // guidance is "do not set"), but kept here as a no-op for older
  // browsers that still honour it.
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export async function middleware(request: NextRequest) {
  // CSRF: Validate origin on state-changing requests
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              sameSite: "strict",
            })
          );
        },
      },
    }
  );

  const isProtectedRoute = request.nextUrl.pathname.startsWith("/account/me");

  // OPTIMIZATION: Only call getUser() (network request) for protected routes
  // For public routes, skip auth check entirely to speed up navigation.
  // (The /admin route guard was removed alongside the admin UI — the
  // mobile app will take over admin workflows on its own surface.)
  if (isProtectedRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to home with auth modal trigger
      const redirectUrl = new URL("/", request.url);
      redirectUrl.searchParams.set("auth", "required");
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Add security headers (CSP, X-Frame-Options, etc.)
  addSecurityHeaders(response);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     * - static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
