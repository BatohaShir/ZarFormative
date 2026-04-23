// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry-scrub";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: isProduction ? 0.1 : 1,

  debug: false,

  environment: process.env.NODE_ENV,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  beforeSend: scrubSentryEvent,
});
