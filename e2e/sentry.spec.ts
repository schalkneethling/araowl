import { expect, test, type Page } from "@playwright/test";
import { completeQuiz, loadQuizQuestions, resetClientState } from "./helpers/quiz.ts";

// Matches any Sentry host (o<org>.ingest.<region>.sentry.io etc.) so the
// tests hold even if the DSN or region changes.
const SENTRY_URL = /https:\/\/[^/]*sentry\.io\//;

/** Intercept all Sentry traffic; returns the captured request URLs. */
async function interceptSentry(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route(SENTRY_URL, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  return requests;
}

test.describe("sentry", () => {
  test("a clean quiz run sends nothing to Sentry", async ({ page }) => {
    const requests = await interceptSentry(page);

    await resetClientState(page);
    const questions = await loadQuizQuestions();
    await completeQuiz(page, questions, () => 0);

    // Errors-only monitoring: a healthy session must produce zero Sentry
    // traffic (no sessions, no tracing, no replay).
    expect(requests).toEqual([]);
  });

  test("?sentry-test sends an error envelope to the ingest endpoint", async ({ page }) => {
    const requests = await interceptSentry(page);

    await page.goto("/?sentry-test");
    await expect(page.locator("h1")).toContainText("AraOwl");

    // The deliberate error is thrown after mount; the SDK ships it as an
    // envelope POST. Intercepted above, so no quota is spent.
    await expect.poll(() => requests.length, { timeout: 10_000 }).toBeGreaterThan(0);
    expect(requests[0]).toContain("/envelope/");
  });
});
