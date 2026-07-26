import { expect, test, type Page } from "@playwright/test";
import { completeQuiz, loadQuizQuestions, resetClientState } from "./helpers/quiz.ts";

// Matches any Sentry host (o<org>.ingest.<region>.sentry.io etc.) so the
// tests hold even if the DSN or region changes.
const SENTRY_URL = /https:\/\/[^/]*sentry\.io\//;

type CapturedRequest = {
  url: string;
  body: string;
};

/** Intercept all Sentry traffic; returns the captured requests. */
async function interceptSentry(page: Page): Promise<CapturedRequest[]> {
  const requests: CapturedRequest[] = [];
  await page.route(SENTRY_URL, (route) => {
    requests.push({ url: route.request().url(), body: route.request().postData() ?? "" });
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
    expect(requests[0]?.url).toContain("/envelope/");

    // The envelope body is newline-delimited JSON; find the error event and
    // hold the no-PII guarantee: our labelled error is present, but no
    // request context (page URL, referrer, user-agent) and no user data.
    const items = (requests[0]?.body ?? "")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const errorEvent = items.find((item) => "exception" in item);
    expect(errorEvent, "envelope must contain an error event").toBeDefined();
    expect(JSON.stringify(errorEvent)).toContain("AraOwl Sentry verification error");
    expect(errorEvent?.["request"]).toBeUndefined();
    expect(errorEvent?.["user"]).toBeUndefined();
  });
});
