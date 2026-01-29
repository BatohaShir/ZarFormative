/**
 * Error Tracking Abstraction Layer
 *
 * This module provides a unified interface for error tracking.
 * Currently logs to console, but can be easily extended to use Sentry, LogRocket, etc.
 *
 * To enable Sentry:
 * 1. Install: pnpm add @sentry/nextjs
 * 2. Run: npx @sentry/wizard@latest -i nextjs
 * 3. Set NEXT_PUBLIC_SENTRY_DSN in .env
 * 4. Uncomment Sentry code below
 */

// import * as Sentry from "@sentry/nextjs";

export interface ErrorContext {
  /** User ID if authenticated */
  userId?: string;
  /** Current route/page */
  route?: string;
  /** Additional context data */
  extra?: Record<string, unknown>;
  /** Error tags for categorization */
  tags?: Record<string, string>;
  /** Error severity level */
  level?: "fatal" | "error" | "warning" | "info" | "debug";
}

/**
 * Capture and report an exception
 */
export function captureException(error: Error, context?: ErrorContext): string {
  // Generate unique error ID
  const errorId = generateErrorId();

  // Always log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error(`[Error ${errorId}]`, error, context);
  }

  // Sentry integration (uncomment when ready)
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   Sentry.withScope((scope) => {
  //     if (context?.userId) scope.setUser({ id: context.userId });
  //     if (context?.route) scope.setTag("route", context.route);
  //     if (context?.tags) {
  //       Object.entries(context.tags).forEach(([key, value]) => {
  //         scope.setTag(key, value);
  //       });
  //     }
  //     if (context?.extra) {
  //       Object.entries(context.extra).forEach(([key, value]) => {
  //         scope.setExtra(key, value);
  //       });
  //     }
  //     if (context?.level) scope.setLevel(context.level);
  //     Sentry.captureException(error);
  //   });
  // }

  // Send to custom error endpoint (optional)
  if (process.env.NEXT_PUBLIC_ERROR_ENDPOINT) {
    sendToErrorEndpoint(error, errorId, context).catch(() => {
      // Silently fail - we don't want error reporting to cause more errors
    });
  }

  return errorId;
}

/**
 * Capture a message (non-exception event)
 */
export function captureMessage(message: string, context?: ErrorContext): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Message]`, message, context);
  }

  // Sentry integration (uncomment when ready)
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   Sentry.captureMessage(message, {
  //     level: context?.level || "info",
  //     tags: context?.tags,
  //     extra: context?.extra,
  //   });
  // }
}

/**
 * Set user context for all subsequent error reports
 */
export function setUser(user: { id: string; email?: string; name?: string } | null): void {
  // Sentry integration (uncomment when ready)
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   if (user) {
  //     Sentry.setUser({
  //       id: user.id,
  //       email: user.email,
  //       username: user.name,
  //     });
  //   } else {
  //     Sentry.setUser(null);
  //   }
  // }

  // Store in sessionStorage for custom error endpoint
  if (typeof window !== "undefined") {
    if (user) {
      sessionStorage.setItem("error_tracking_user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("error_tracking_user");
    }
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: "debug" | "info" | "warning" | "error";
  data?: Record<string, unknown>;
}): void {
  // Sentry integration (uncomment when ready)
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   Sentry.addBreadcrumb({
  //     category: breadcrumb.category,
  //     message: breadcrumb.message,
  //     level: breadcrumb.level || "info",
  //     data: breadcrumb.data,
  //   });
  // }

  if (process.env.NODE_ENV === "development") {
    console.log(`[Breadcrumb: ${breadcrumb.category}]`, breadcrumb.message, breadcrumb.data);
  }
}

// ============================================
// Helper Functions
// ============================================

function generateErrorId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function sendToErrorEndpoint(
  error: Error,
  errorId: string,
  context?: ErrorContext
): Promise<void> {
  const endpoint = process.env.NEXT_PUBLIC_ERROR_ENDPOINT;
  if (!endpoint) return;

  const userJson = typeof window !== "undefined"
    ? sessionStorage.getItem("error_tracking_user")
    : null;
  const user = userJson ? JSON.parse(userJson) : null;

  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      errorId,
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      userId: context?.userId || user?.id,
      route: context?.route,
      extra: context?.extra,
      tags: context?.tags,
      level: context?.level || "error",
    }),
  });
}

// ============================================
// React Error Boundary Helper
// ============================================

/**
 * Use in error.tsx or ErrorBoundary components
 */
export function reportErrorBoundaryError(
  error: Error,
  errorInfo?: { componentStack?: string }
): string {
  return captureException(error, {
    tags: { type: "error_boundary" },
    extra: {
      componentStack: errorInfo?.componentStack,
    },
  });
}

// ============================================
// API Error Helper
// ============================================

/**
 * Use in API routes to report errors
 */
export function reportApiError(
  error: Error,
  request: {
    method: string;
    url: string;
    body?: unknown;
  }
): string {
  return captureException(error, {
    tags: {
      type: "api_error",
      method: request.method,
    },
    extra: {
      url: request.url,
      body: request.body,
    },
  });
}
