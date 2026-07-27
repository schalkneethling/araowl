import { expect, test, type Page } from "@playwright/test";
import { completeQuiz, loadQuizQuestions, TOTAL_QUESTIONS } from "./helpers/quiz.ts";

const ANALYTICS_HOST = /https:\/\/analytics\.schalkneethling\.com\//;

// Stub that records window.umami.track calls where tests can read them —
// proves our wiring without any request reaching the live instance.
const UMAMI_STUB = `
  window.__umamiCalls = [];
  window.umami = { track: (name, data) => window.__umamiCalls.push({ name, data }) };
`;

type TrackCall = {
  name: string;
  data?: Record<string, string | number>;
};

/** Intercept analytics-host requests; script requests get the stub. */
async function interceptAnalytics(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route(ANALYTICS_HOST, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/javascript", body: UMAMI_STUB });
  });
  return requests;
}

function readTrackCalls(page: Page): Promise<TrackCall[]> {
  return page.evaluate(() => (window as { __umamiCalls?: TrackCall[] }).__umamiCalls ?? []);
}

test.describe("analytics consent", () => {
  test("first visit shows the banner and loads nothing from the analytics host", async ({
    page,
  }) => {
    const requests = await interceptAnalytics(page);

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Allow analytics" })).toBeVisible();
    await expect(page.getByRole("button", { name: "No thanks" })).toBeVisible();

    expect(requests).toEqual([]);
  });

  test("declining persists, keeps the host unrequested, and remains revisable", async ({
    page,
  }) => {
    const requests = await interceptAnalytics(page);

    await page.goto("/");
    // Keyboard-only: every input method is first-class.
    await page.getByRole("button", { name: "No thanks" }).press("Enter");
    // Scoped: the score history aside owns a second status region.
    await expect(page.locator("#consent-root").getByRole("status")).toHaveText(
      "Analytics disabled.",
    );
    await expect(page.getByRole("button", { name: "Allow analytics" })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("button", { name: "Analytics preferences" })).toBeVisible();
    expect(requests).toEqual([]);

    // The choice is revisable: reopening shows the full banner again.
    await page.getByRole("button", { name: "Analytics preferences" }).press("Enter");
    await expect(page.getByRole("button", { name: "Allow analytics" })).toBeVisible();
  });

  test("granting loads the script and quiz events fire with aggregate data", async ({ page }) => {
    const requests = await interceptAnalytics(page);

    await page.goto("/");
    await page.getByRole("button", { name: "Allow analytics" }).press("Enter");
    await expect(page.locator("#consent-root").getByRole("status")).toHaveText(
      "Analytics enabled.",
    );
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toContain("analytics.js");

    // Consent persists: the script loads again on the next visit.
    await page.reload();
    await expect.poll(() => requests.length).toBe(2);

    const questions = await loadQuizQuestions();
    const roundOne = questions.slice(0, TOTAL_QUESTIONS);
    const expectedScore = roundOne.filter((question) => question.answerIndex === 0).length;
    await completeQuiz(page, roundOne, () => 0);

    const calls = await readTrackCalls(page);
    expect(calls).toContainEqual({ name: "quiz-started", data: { source: "bundled" } });
    expect(calls).toContainEqual({
      name: "quiz-completed",
      data: { score: expectedScore, total: TOTAL_QUESTIONS },
    });
  });

  test("a full quiz run triggers no CSP violations", async ({ page }) => {
    await interceptAnalytics(page);
    await page.addInitScript(() => {
      const violations: string[] = [];
      (window as { __cspViolations?: string[] }).__cspViolations = violations;
      document.addEventListener("securitypolicyviolation", (event) => {
        violations.push(`${event.violatedDirective}: ${event.blockedURI}`);
      });
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Allow analytics" }).press("Enter");
    const questions = await loadQuizQuestions();
    await completeQuiz(page, questions.slice(0, TOTAL_QUESTIONS), () => 0);

    const violations = await page.evaluate(
      () => (window as { __cspViolations?: string[] }).__cspViolations ?? [],
    );
    expect(violations).toEqual([]);
  });
});
