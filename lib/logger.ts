/**
 * Production-safe logging utility
 * - error/warn: ALWAYS log (needed for debugging production issues)
 * - log/info: development only (verbose, not needed in production)
 */

const isDev = process.env.NODE_ENV === "development";

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  error: (...args: unknown[]) => {
    // Always log errors — critical for production debugging
    console.error(...args);
  },

  warn: (...args: unknown[]) => {
    // Always log warnings — important for production monitoring
    console.warn(...args);
  },

  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
};
