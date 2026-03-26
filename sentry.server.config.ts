// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Production: 10% of traces to control costs. Development: 100%
  tracesSampleRate: isProduction ? 0.1 : 1,

  debug: false,

  // Environment
  environment: process.env.NODE_ENV,

  // Only enable Sentry in production if DSN is provided
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
