import { ENV } from "varlock/env";

export type AnalyticsConsent = "granted" | "denied";

export const ANALYTICS_CONSENT_STORAGE_KEY = "araowl:analytics-consent:v1";
export const UMAMI_SCRIPT_ID = "umami-analytics";

type UmamiGlobal = {
  track?: (name: string, data?: Record<string, string | number>) => void;
};

/** localStorage can throw (private mode, storage disabled) — treat as absent. */
function getBrowserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function isAnalyticsConsent(value: unknown): value is AnalyticsConsent {
  return value === "granted" || value === "denied";
}

export function readAnalyticsConsent(
  storage: Storage | null = getBrowserStorage(),
): AnalyticsConsent | null {
  if (!storage) {
    return null;
  }
  try {
    const stored = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return isAnalyticsConsent(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function writeAnalyticsConsent(
  consent: AnalyticsConsent,
  storage: Storage | null = getBrowserStorage(),
): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
    return true;
  } catch {
    return false;
  }
}

type PendingEvent = {
  name: string;
  data?: Record<string, string | number>;
};

// Events recorded between consent (script requested) and the deferred script
// becoming ready. Only ever populated after consent; bounded so a
// never-loading script cannot grow it.
const pendingEvents: PendingEvent[] = [];
const PENDING_EVENT_LIMIT = 20;

function getUmami(): UmamiGlobal | undefined {
  return (globalThis as { umami?: UmamiGlobal }).umami;
}

function flushPendingEvents(): void {
  const umami = getUmami();
  if (!umami?.track) {
    return;
  }
  for (const event of pendingEvents.splice(0)) {
    umami.track(event.name, event.data);
  }
}

/**
 * Inject the Umami tracking script. Must only be called after the user has
 * granted consent — nothing is fetched from the analytics host before then.
 * Idempotent via the script id, and a no-op when the config is absent.
 */
export function loadUmamiAnalytics(documentRef: Document = document): void {
  if (!ENV.UMAMI_SCRIPT_URL || !ENV.UMAMI_WEBSITE_ID) {
    return;
  }
  if (documentRef.getElementById(UMAMI_SCRIPT_ID)) {
    return;
  }

  const script = documentRef.createElement("script");
  script.defer = true;
  script.id = UMAMI_SCRIPT_ID;
  script.src = ENV.UMAMI_SCRIPT_URL;
  script.dataset["websiteId"] = ENV.UMAMI_WEBSITE_ID;
  // Deliver events recorded while the deferred script was still in flight
  // (e.g. consent granted and a quiz started immediately).
  script.addEventListener("load", flushPendingEvents);
  documentRef.head.appendChild(script);
}

/**
 * Record a named event with optional aggregate data (numbers/short strings
 * only — never PII). Before consent this is a silent no-op; after consent,
 * events fired while the script is still loading are queued and flushed on
 * script load instead of being dropped.
 */
export function trackEvent(
  name: string,
  data?: Record<string, string | number>,
  documentRef: Document | null = globalThis.document ?? null,
): void {
  const umami = getUmami();
  if (umami?.track) {
    flushPendingEvents();
    umami.track(name, data);
    return;
  }

  // Queue only when the script has actually been requested (consent given);
  // without consent the script element never exists and nothing is retained.
  const scriptRequested = Boolean(documentRef?.getElementById(UMAMI_SCRIPT_ID));
  if (scriptRequested && pendingEvents.length < PENDING_EVENT_LIMIT) {
    pendingEvents.push({ name, data });
  }
}
