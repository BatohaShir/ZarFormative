// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry-scrub";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: isProduction ? 0.1 : 1,

  debug: false,

  replaysOnErrorSampleRate: isProduction ? 0.5 : 1.0,
  replaysSessionSampleRate: isProduction ? 0.02 : 0.1,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  environment: process.env.NODE_ENV,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});
