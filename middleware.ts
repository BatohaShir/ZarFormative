import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
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

  // Refresh auth token
  const { data: { user } } = await supabase.auth.getUser();

  // Admin routes protection - check role in middleware for instant redirect
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute) {
    if (!user) {
      // Not logged in - redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Check user role from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    if (role !== "admin" && role !== "manager") {
      // Not authorized - redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protected account routes - require authentication
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/account/me");

  if (isProtectedRoute && !user) {
    // Redirect to home with auth modal trigger
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("auth", "required");
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

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
