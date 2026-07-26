// First import on purpose: Sentry initializes as a side effect of this
// module, so errors thrown while the app modules below evaluate are captured.
import "@/instrument";

import "./styles/global.css";

import { AnalyticsConsentBanner } from "@/app/components/analytics-consent-banner";
import { IslandErrorFallback } from "@/app/components/island-error-fallback";
import { QuizApp } from "@/app/quiz-app";
import { ThemeSwitcher } from "@/app/theme/theme-switcher";
import { throwTestErrorIfRequested } from "@/instrument";
import { ErrorBoundary } from "@sentry/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

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
