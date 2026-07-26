import * as Sentry from "@sentry/react";
import { ENV } from "varlock/env";

/**
 * Initialize Sentry error monitoring. Must run before any React root mounts
 * so module-evaluation and render errors are captured from the first frame.
 *
 * Errors only: no tracing, no replay, no PII. `enabled` is gated to built
 * output so the dev server never spends quota; events carry APP_ENV so the
 * dashboard can separate preview from production.
 */
export function initErrorMonitoring(): void {
  if (!ENV.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: ENV.SENTRY_DSN,
    enabled: import.meta.env.PROD,
    environment: ENV.APP_ENV ?? "dev",
    sendDefaultPii: false,
  });
}

/**
 * Deliberate crash hook for verifying the pipeline end to end: load any page
 * with `?sentry-test` and an unhandled, clearly-labelled error is thrown
 * after mount. Used for the Phase 2.5 stop and post-deploy smoke checks; it
 * only wastes our own quota, so it is safe to leave in.
 */
export function throwTestErrorIfRequested(): void {
  if (!new URLSearchParams(window.location.search).has("sentry-test")) {
    return;
  }

  // Deferred so both islands finish mounting before the error fires, and
  // thrown (not captured) so it exercises the global handler path.
  setTimeout(() => {
    throw new Error("AraOwl Sentry verification error (?sentry-test)");
  }, 0);
}
