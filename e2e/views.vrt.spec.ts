import { expect, test, type Page } from "@playwright/test";
import {
  completeQuiz,
  countCycleCompleted,
  countStoredAttempts,
  loadQuizQuestions,
  resetClientState,
  startQuiz,
  TOTAL_QUESTIONS,
  type QuizQuestionData,
} from "./helpers/quiz.ts";

// Visual regression coverage for every stable view of the Phase-2 surface.
// Runs only inside the pinned Playwright Docker image (`pnpm test:vrt`) so the
// committed -linux baselines are reproducible; the main config ignores this
// spec on the host. Screenshots are taken in both forced themes — "system"
// is skipped because it renders identically to whichever theme it resolves to.

let questions: QuizQuestionData[];

test.beforeAll(async () => {
  questions = await loadQuizQuestions();
});

const THEMES = ["light", "dark"] as const;

// Attempt timestamps render through Intl.DateTimeFormat, so the score-history
// snapshot is only stable with a fixed Date. setFixedTime (rather than
// clock.install) keeps real timers running — React effects, font loading, and
// the service worker behave normally; only Date is pinned.
const FIXED_TIME = new Date("2026-07-01T10:30:30Z");

async function setTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
  // force: the role=radio input is visually hidden (same as theme-switcher.spec.ts).
  await page.getByRole("radio", { name: theme === "light" ? "Light" : "Dark" }).click({
    force: true,
  });
}

async function expectStableScreenshot(page: Page, name: string): Promise<void> {
  // Self-hosted @fontsource fonts can swap in late and shift text metrics.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    // Hides bottom-fixed elements, which stitch nondeterministically in
    // full-page captures; see vrt-screenshot.css.
    stylePath: new URL("vrt-screenshot.css", import.meta.url).pathname,
  });
}

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME);
      await resetClientState(page);
      await setTheme(page, theme);
    });

    test("start view with empty history", async ({ page }) => {
      // The cycle-progress line renders after an async IndexedDB read —
      // anchor on the exact fresh-cycle text so the capture never races it.
      await expect(page.getByText(/^0 of 50 questions completed/)).toBeVisible();
      await expectStableScreenshot(page, `start-empty-${theme}.png`);
    });

    test("question view with a selected option and a revealed hint", async ({ page }) => {
      const first = questions[0];
      if (!first) {
        throw new Error("quiz manifest must have at least 1 question");
      }

      await startQuiz(page);

      const hintCount = Math.min(first.hints.length, 3);
      await page.getByRole("button", { name: `Reveal hint 1/${hintCount}` }).press("Enter");
      await expect(page.getByText(first.hints[0] ?? "")).toBeVisible();

      // Scoped to #quiz-root: the header's theme switcher is also a radiogroup.
      const radios = page.locator("#quiz-root").getByRole("radio");
      await radios.first().press("Space");
      await expect(radios.first()).toBeChecked();

      await expectStableScreenshot(page, `question-selected-hint-${theme}.png`);
    });

    test("answer feedback with explanation", async ({ page }) => {
      const first = questions[0];
      if (!first) {
        throw new Error("quiz manifest must have at least 1 question");
      }

      await startQuiz(page);
      await page.locator("#quiz-root").getByRole("radio").first().press("Space");
      await page.getByRole("button", { name: "Check answer" }).press("Enter");

      // First option chosen, so which feedback state renders is fixed by the
      // manifest — assert it so the snapshot never captures a half-rendered card.
      const correct = first.answerIndex === 0;
      await expect(
        page.getByText(correct ? "Correct" : "Incorrect", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(first.explanation)).toBeVisible();

      await expectStableScreenshot(page, `feedback-${theme}.png`);
    });

    test("results view", async ({ page }) => {
      await completeQuiz(page, questions.slice(0, TOTAL_QUESTIONS), () => 0);
      await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();

      await expectStableScreenshot(page, `results-${theme}.png`);
    });

    test("analytics consent banner", async ({ page }) => {
      // resetClientState seeds a declined choice; clearing it restores the
      // first-visit state where the banner overlays the top of the page.
      await page.evaluate(() => localStorage.removeItem("araowl:analytics-consent:v1"));
      await page.reload();
      await expect(page.getByRole("button", { name: "Allow analytics" })).toBeVisible();

      // The cycle-progress line renders after an async IndexedDB read —
      // anchor on the exact fresh-cycle text so the capture never races it.
      await expect(page.getByText(/^0 of 50 questions completed/)).toBeVisible();
      await expectStableScreenshot(page, `consent-banner-${theme}.png`);
    });

    test("analytics preferences chip", async ({ page }) => {
      // Element-level shot: the chip is bottom-fixed, which full-page
      // captures stitch nondeterministically (hence its exclusion there).
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await expect(page.locator(".analytics-consent__collapsed")).toHaveScreenshot(
        `consent-chip-${theme}.png`,
      );
    });

    test("start view with one past attempt", async ({ page }) => {
      await completeQuiz(
        page,
        questions.slice(0, TOTAL_QUESTIONS),
        (question) => question.answerIndex,
      );
      // Both async post-completion writes must commit before the reload: the
      // attempt (score store) and the cycle progress (progress store) — the
      // latter drives the "All N completed" line this screenshot shows.
      await expect.poll(() => countStoredAttempts(page)).toBe(1);
      await expect.poll(() => countCycleCompleted(page)).toBe(TOTAL_QUESTIONS);
      await page.reload();

      const history = page.getByRole("complementary", { name: "Past attempts" });
      await expect(history.getByRole("listitem")).toHaveCount(1);
      await expect(history).toContainText(`${TOTAL_QUESTIONS} / ${TOTAL_QUESTIONS}`);

      // Anchor on the exact post-round text: the generic phrase would also
      // match the transient "0 of 50" state before progress loads.
      await expect(page.getByText(/^10 of 50 questions completed/)).toBeVisible();
      await expectStableScreenshot(page, `start-with-history-${theme}.png`);
    });

    test("history delete confirmation", async ({ page }) => {
      await completeQuiz(
        page,
        questions.slice(0, TOTAL_QUESTIONS),
        (question) => question.answerIndex,
      );
      await expect.poll(() => countStoredAttempts(page)).toBe(1);
      await expect.poll(() => countCycleCompleted(page)).toBe(TOTAL_QUESTIONS);
      await page.reload();

      await page.getByRole("button", { name: /Delete attempt from/ }).press("Enter");
      await expect(
        page.getByRole("button", { name: /Confirm deletion of the attempt/ }),
      ).toBeVisible();

      // Anchor on the exact post-round text: the generic phrase would also
      // match the transient "0 of 50" state before progress loads.
      await expect(page.getByText(/^10 of 50 questions completed/)).toBeVisible();
      await expectStableScreenshot(page, `history-confirm-${theme}.png`);
    });
  });
}
