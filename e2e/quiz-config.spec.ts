import { expect, test } from "@playwright/test";
import {
  completeQuiz,
  completeQuizAnyOrder,
  loadQuizQuestions,
  resetClientState,
  TOTAL_QUESTIONS,
  type QuizQuestionData,
} from "./helpers/quiz.ts";

let questions: QuizQuestionData[];

test.beforeAll(async () => {
  questions = await loadQuizQuestions();
});

test.beforeEach(async ({ page }) => {
  await resetClientState(page);
});

test.describe("quiz configuration", () => {
  test("size slider bounds track the bundled pool", async ({ page }) => {
    // React Aria renders a native range input: bounds are its min/max
    // attributes (the a11y tree derives valuemin/valuemax from them).
    const slider = page.locator("#quiz-root").getByRole("slider");
    await expect(slider).toHaveAttribute("min", "10");
    // The slider max follows the pool (rounded to tens), so growing the pool
    // unlocks larger sizes with no code change — this documents that link.
    const expectedMax = String(Math.max(10, Math.floor(questions.length / 10) * 10));
    await expect(slider).toHaveAttribute("max", expectedMax);
    await expect(page.getByText(`${TOTAL_QUESTIONS} questions`, { exact: true })).toBeVisible();
  });

  test("mode selection persists across reload", async ({ page }) => {
    // force: the role=radio input is visually hidden by React Aria (same
    // pattern as theme-switcher.spec.ts).
    await page
      .locator("#quiz-root")
      .getByRole("radio", { name: /Randomized/ })
      .click({ force: true });
    await page.reload();
    await expect(
      page.locator("#quiz-root").getByRole("radio", { name: /Randomized/ }),
    ).toBeChecked();
  });

  test("sequential mode reports an exhausted cycle and starts a fresh one", async ({ page }) => {
    await completeQuiz(page, questions, () => 0);
    await page.getByRole("button", { name: "Try again" }).press("Enter");

    await expect(
      page.getByText(
        `All ${questions.length} questions completed — your next quiz starts a fresh cycle.`,
      ),
    ).toBeVisible();

    // The fresh cycle serves the full set again, in manifest order.
    await completeQuiz(page, questions, () => 0);
    await page.getByRole("button", { name: "Try again" }).press("Enter");
    await expect(page.getByText(/questions completed/)).toBeVisible();
  });

  test("randomized mode plays every pool question once per round", async ({ page }) => {
    await page
      .locator("#quiz-root")
      .getByRole("radio", { name: /Randomized/ })
      .click({ force: true });

    // Pool size equals round size here, so a round covers the whole pool —
    // the helper matches each question by heading, whatever the order.
    await completeQuizAnyOrder(
      page,
      questions,
      TOTAL_QUESTIONS,
      (question) => question.answerIndex,
    );
    await expect(
      page.getByText(`${TOTAL_QUESTIONS} / ${TOTAL_QUESTIONS}`, { exact: true }),
    ).toBeVisible();
  });
});
