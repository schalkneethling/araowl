import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type AnalyticsConsent,
  loadUmamiAnalytics,
  readAnalyticsConsent,
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
    writeAnalyticsConsent(choice);
    setConsent(choice);
    setReopened(false);
    setConfirmation(choice === "granted" ? "Analytics enabled." : "Analytics disabled.");
  }, []);

  const showBanner = consent === null || reopened;

  return (
    <section aria-labelledby="analytics-consent-title" className="analytics-consent">
      {showBanner ? (
        <div className="analytics-consent__banner">
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
