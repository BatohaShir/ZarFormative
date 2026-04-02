import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isDev = process.env.NODE_ENV === "development";

// Allowed origins for CSRF protection (localhost only in development)
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

  const isAllowed = ALLOWED_ORIGINS.some((allowed) => checkUrl === allowed);
  if (!isAllowed) {
    return NextResponse.json(
      { error: "CSRF validation failed: origin not allowed" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Add security headers to response: CSP, X-Frame-Options, etc.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
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
    `connect-src 'self' ${supabaseUrl} https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");

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

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/account/me");

  // OPTIMIZATION: Only call getUser() (network request) for protected/admin routes
  // For public routes, skip auth check entirely to speed up navigation
  if (isAdminRoute || isProtectedRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isAdminRoute) {
      if (!user) {
        return NextResponse.redirect(new URL("/", request.url));
      }

      // Use JWT app_metadata.role first (no DB query needed)
      // Falls back to DB query only if JWT doesn't have role
      const jwtRole = user.app_metadata?.role;
      let role = jwtRole;

      if (!role) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        role = profile?.role;
      }

      if (role !== "admin" && role !== "manager") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    if (isProtectedRoute && !user) {
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
