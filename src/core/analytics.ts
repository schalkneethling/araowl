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
  documentRef.head.appendChild(script);
}

/**
 * Record a named event with optional aggregate data (numbers/short strings
 * only — never PII). Silently a no-op unless the Umami script is loaded,
 * which can only happen after consent.
 */
export function trackEvent(name: string, data?: Record<string, string | number>): void {
  const umami = (globalThis as { umami?: UmamiGlobal }).umami;
  umami?.track?.(name, data);
}
