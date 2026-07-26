import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type AnalyticsConsent,
  loadUmamiAnalytics,
  readAnalyticsConsent,
  UMAMI_SCRIPT_ID,
  writeAnalyticsConsent,
} from "@/core/analytics";

/**
 * Consent-gated analytics banner. Deliberately a plain labelled section as
 * the first content in the page — encountered naturally by keyboard and
 * screen reader users — rather than role="alert" (text-only, assertive) or a
 * focus-trapping dialog; see the GOV.UK cookie-banner precedent. The
 * role="status" region announces the outcome of the user's own choice,
 * which is the appropriate live-region moment.
 */
export function AnalyticsConsentBanner() {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(() => readAnalyticsConsent());
  const [reopened, setReopened] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  // A returning visitor who previously granted consent gets the script on
  // every load; nothing is ever fetched from the analytics host otherwise.
  useEffect(() => {
    if (consent === "granted") {
      loadUmamiAnalytics();
    }
  }, [consent]);

  const choose = useCallback((choice: AnalyticsConsent) => {
    // Persisted before any state updates; if storage is unavailable the
    // choice still holds for this session and the banner re-asks next visit.
    writeAnalyticsConsent(choice);
    setConsent(choice);
    setReopened(false);
    if (choice === "granted") {
      setConfirmation("Analytics enabled.");
      return;
    }
    // Revoking cannot unload an already-running script mid-session — say so.
    setConfirmation(
      document.getElementById(UMAMI_SCRIPT_ID)
        ? "Analytics disabled. This takes full effect the next time the page loads."
        : "Analytics disabled.",
    );
  }, []);

  const showBanner = consent === null || reopened;

  return (
    <section aria-labelledby="analytics-consent-title" className="analytics-consent">
      {showBanner ? (
        // tabIndex: the banner scrolls internally in short/zoomed viewports
        // (max-block-size in analytics-consent.css), and a scrollable region
        // must be keyboard-focusable to be keyboard-scrollable.
        <div
          aria-labelledby="analytics-consent-title"
          className="analytics-consent__banner"
          role="group"
          tabIndex={0}
        >
          <p className="analytics-consent__text">
            <strong id="analytics-consent-title">Privacy-friendly analytics</strong> AraOwl can use
            cookieless, self-hosted analytics to understand aggregate usage — no ad trackers, no
            cross-site cookies, and nothing loads unless you allow it. Declining after a previous
            &ldquo;allow&rdquo; takes full effect the next time the page loads.
          </p>
          <div className="analytics-consent__actions">
            <Button onPress={() => choose("denied")} variant="secondary">
              No thanks
            </Button>
            <Button onPress={() => choose("granted")}>Allow analytics</Button>
          </div>
        </div>
      ) : (
        <div className="analytics-consent__collapsed">
          <span className="visually-hidden" id="analytics-consent-title">
            Analytics preferences
          </span>
          <Button onPress={() => setReopened(true)} size="xs" variant="ghost">
            Analytics preferences
          </Button>
        </div>
      )}
      <p className="visually-hidden" role="status">
        {confirmation}
      </p>
    </section>
  );
}
