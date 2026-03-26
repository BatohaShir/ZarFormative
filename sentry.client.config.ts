// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Production: 10% of traces to control costs. Development: 100%
  tracesSampleRate: isProduction ? 0.1 : 1,

  debug: false,

  // Replay: always capture on error, minimal session sampling in production
  replaysOnErrorSampleRate: isProduction ? 0.5 : 1.0,
  replaysSessionSampleRate: isProduction ? 0.02 : 0.1,

  integrations: [
    Sentry.replayIntegration({
      // Additional SDK configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Environment
  environment: process.env.NODE_ENV,

  // Only enable Sentry in production if DSN is provided
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
