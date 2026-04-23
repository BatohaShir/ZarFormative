// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});
