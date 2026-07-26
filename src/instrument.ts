import * as Sentry from "@sentry/react";
import { ENV } from "varlock/env";

/**
 * Sentry error monitoring, initialized as a module side effect so that
 * importing this module first (see main.tsx) captures errors thrown while
 * later app modules evaluate — a function called after imports would run too
 * late for those.
 *
 * Errors only, and strictly no PII to third parties: no tracing, no replay,
 * no session tracking. The HttpContext and CultureContext integrations are
 * removed and `beforeSend` drops any request context, so events never carry
 * page URL, referrer, user-agent, locale, or timezone; `sendDefaultPii:
 * false` disables IP collection. The e2e suite asserts the outgoing envelope
 * stays clean of these fields.
 * `enabled` is gated to built output so the dev server never spends quota;
 * events carry APP_ENV so the dashboard can separate preview from production.
 */
if (ENV.SENTRY_DSN) {
  Sentry.init({
    dsn: ENV.SENTRY_DSN,
    enabled: import.meta.env.PROD,
    environment: ENV.APP_ENV ?? "dev",
    sendDefaultPii: false,
    integrations: (defaults) => {
      // HttpContext attaches page URL/referrer/user-agent; CultureContext
      // attaches locale and timezone (coarse location). Both are PII under
      // this project's rules and neither is needed to fix a bug.
      const blocked = new Set(["HttpContext", "CultureContext"]);
      return defaults.filter((integration) => !blocked.has(integration.name));
    },
    beforeSend(event) {
      // Defense in depth for the no-PII guarantee should a future SDK or
      // integration change reintroduce request or culture metadata.
      delete event.request;
      if (event.contexts) {
        delete event.contexts["culture"];
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      // Breadcrumbs may carry URLs: navigation crumbs are page URLs
      // (dropped entirely), fetch/xhr crumbs keep method/status for
      // debugging but lose the URL.
      if (breadcrumb.category === "navigation") {
        return null;
      }
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
        delete breadcrumb.data?.["url"];
      }
      return breadcrumb;
    },
  });
}

/**
 * Deliberate crash hook for verifying the pipeline end to end: load any page
 * with `?sentry-test` and an unhandled, clearly-labelled error is thrown
 * after mount. Used for the Phase 2.5 stop and post-deploy smoke checks; it
 * only wastes our own quota, so it is safe to leave in. Note: monitoring is
 * active in built output only, so verify against `vp build && vp preview`,
 * never the dev server.
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
