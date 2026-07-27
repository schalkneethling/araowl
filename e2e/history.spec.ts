import { expect, test } from "@playwright/test";
import {
  completeQuiz,
  countCycleCompleted,
  countStoredAttempts,
  loadQuizQuestions,
  resetClientState,
  TOTAL_QUESTIONS,
  type QuizQuestionData,
} from "./helpers/quiz.ts";

let questions: QuizQuestionData[];
let roundOne: QuizQuestionData[];
let roundTwo: QuizQuestionData[];

test.beforeAll(async () => {
  questions = await loadQuizQuestions();
  roundOne = questions.slice(0, TOTAL_QUESTIONS);
  roundTwo = questions.slice(TOTAL_QUESTIONS, TOTAL_QUESTIONS * 2);
});

// Two attempts with distinct scores: all-correct first (older), all-wrong
// second (newer) — history lists newest first, so rows are 0/10 then 10/10.
test.beforeEach(async ({ page }) => {
  await resetClientState(page);
  await completeQuiz(page, roundOne, (question) => question.answerIndex);
  await expect.poll(() => countStoredAttempts(page)).toBe(1);
  // Round two serves the next sequential slice only after round one's
  // progress write commits (see quiz.spec.ts — CI-exposed race).
  await expect.poll(() => countCycleCompleted(page)).toBe(TOTAL_QUESTIONS);
  await page.getByRole("button", { name: "Try again" }).press("Enter");
  await completeQuiz(page, roundTwo, (question) => (question.answerIndex + 1) % 4);
  await expect.poll(() => countStoredAttempts(page)).toBe(2);
  await page.getByRole("button", { name: "Try again" }).press("Enter");
});

const history = (page: import("@playwright/test").Page) =>
  page.getByRole("complementary", { name: "Past attempts" });

test.describe("score history management", () => {
  test("deletes a single attempt keyboard-only, managing focus and announcing", async ({
    page,
  }) => {
    const items = history(page).getByRole("listitem");
    await expect(items).toHaveCount(2);

    // Delete the newest attempt (0/10). Enter activates; the inline Confirm
    // receives focus, so the whole flow needs no pointer.
    await history(page)
      .getByRole("button", { name: /Delete attempt from/ })
      .first()
      .press("Enter");
    const confirm = history(page).getByRole("button", { name: /Confirm deletion of the attempt/ });
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText(`${TOTAL_QUESTIONS} / ${TOTAL_QUESTIONS}`);
    await expect(history(page).getByRole("status")).toHaveText("Attempt deleted.");
    // Focus lands on the surviving row's Delete button, not the page body.
    await expect(history(page).getByRole("button", { name: /Delete attempt from/ })).toBeFocused();

    await expect.poll(() => countStoredAttempts(page)).toBe(1);
    await page.reload();
    await expect(history(page).getByRole("listitem")).toHaveCount(1);
  });

  test("cancelling a delete keeps the attempt and returns focus to the trigger", async ({
    page,
  }) => {
    const firstDelete = history(page)
      .getByRole("button", { name: /Delete attempt from/ })
      .first();
    await firstDelete.press("Enter");
    await expect(
      history(page).getByRole("button", { name: /Confirm deletion of the attempt/ }),
    ).toBeFocused();

    // Tab moves from Confirm to Cancel; Enter activates it.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await expect(history(page).getByRole("listitem")).toHaveCount(2);
    await expect(firstDelete).toBeFocused();
    await expect.poll(() => countStoredAttempts(page)).toBe(2);

    // Same guarantee for the clear-all confirm: Cancel returns focus to the
    // Clear history trigger instead of dropping it to the body.
    const clearButton = history(page).getByRole("button", { name: "Clear history" });
    await clearButton.press("Enter");
    await expect(
      history(page).getByRole("button", { name: /Confirm deletion of all/ }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(history(page).getByRole("listitem")).toHaveCount(2);
    await expect(clearButton).toBeFocused();
  });

  test("clear history empties the list, focuses the heading, and persists", async ({ page }) => {
    await history(page).getByRole("button", { name: "Clear history" }).press("Enter");
    const confirm = history(page).getByRole("button", { name: /Confirm deletion of all/ });
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(history(page).getByRole("listitem")).toHaveCount(0);
    await expect(history(page).getByText(/haven't completed a quiz yet/)).toBeVisible();
    await expect(history(page).getByRole("status")).toHaveText("History cleared.");
    await expect(history(page).getByRole("heading", { name: "Past attempts" })).toBeFocused();

    await expect.poll(() => countStoredAttempts(page)).toBe(0);
    await page.reload();
    await expect(history(page).getByText(/haven't completed a quiz yet/)).toBeVisible();
  });
});
