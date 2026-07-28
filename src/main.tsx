// First import on purpose: Sentry initializes as a side effect of this
// module, so errors thrown while the app modules below evaluate are captured.
import "@/instrument";

import "./styles/global.css";

import { AnalyticsConsentBanner } from "@/app/components/analytics-consent-banner";
import { IslandErrorFallback } from "@/app/components/island-error-fallback";
import { QuizApp } from "@/app/quiz-app";
import { ThemeSwitcher } from "@/app/theme/theme-switcher";
import { throwTestErrorIfRequested } from "@/instrument";
import { captureException, ErrorBoundary } from "@sentry/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

// Explicit registration (injectRegister is off) so failures are handled:
// registration fetches fail routinely at scale — flaky networks, aborted
// loads, privacy extensions — and must not surface as unhandled rejections.
// Reported to Sentry as handled events so real spikes stay visible without
// masquerading as crashes. The app works without a service worker; only
// offline support is affected, and the next load retries naturally.
registerSW({
  onRegisterError(error: unknown) {
    console.error("Service worker registration failed", error);
    captureException(error, { tags: { surface: "sw-registration" } });
  },
});

const consentRoot = document.getElementById("consent-root");
if (consentRoot) {
  createRoot(consentRoot).render(
    <StrictMode>
      <ErrorBoundary fallback={<IslandErrorFallback />}>
        <AnalyticsConsentBanner />
      </ErrorBoundary>
    </StrictMode>,
  );
}

const themeRoot = document.getElementById("theme-root");
if (themeRoot) {
  createRoot(themeRoot).render(
    <StrictMode>
      <ErrorBoundary fallback={<IslandErrorFallback />}>
        <ThemeSwitcher />
      </ErrorBoundary>
    </StrictMode>,
  );
}

const quizRoot = document.getElementById("quiz-root");
if (quizRoot) {
  createRoot(quizRoot).render(
    <StrictMode>
      <ErrorBoundary fallback={<IslandErrorFallback />}>
        <QuizApp />
      </ErrorBoundary>
    </StrictMode>,
  );
}

throwTestErrorIfRequested();
