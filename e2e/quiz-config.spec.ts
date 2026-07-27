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

  test("sequential rounds never resurface completed questions", async ({ page }) => {
    // Round one: the first ten manifest questions.
    await completeQuiz(page, questions.slice(0, TOTAL_QUESTIONS), () => 0);
    await page.getByRole("button", { name: "Try again" }).press("Enter");
    await expect(
      page.getByText(`${TOTAL_QUESTIONS} of ${questions.length} questions completed this cycle.`),
    ).toBeVisible();

    // Round two must serve the NEXT ten — completeQuiz asserts each heading,
    // so passing the second slice proves nothing resurfaced.
    await completeQuiz(page, questions.slice(TOTAL_QUESTIONS, TOTAL_QUESTIONS * 2), () => 0);
    await page.getByRole("button", { name: "Try again" }).press("Enter");
    await expect(
      page.getByText(
        `${TOTAL_QUESTIONS * 2} of ${questions.length} questions completed this cycle.`,
      ),
    ).toBeVisible();
  });

  test("an exhausted sequential cycle announces itself and resets on the next quiz", async ({
    page,
  }) => {
    // Seed every question except the first round as already completed, so a
    // single played round exhausts the cycle without playing all five rounds.
    const laterIds = questions.slice(TOTAL_QUESTIONS).map((question) => question.id);
    await page.evaluate((ids) => {
      return new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("araowl");
        open.addEventListener("success", () => {
          const db = open.result;
          const tx = db.transaction("question-progress", "readwrite");
          for (const id of ids) {
            tx.objectStore("question-progress").put({
              questionId: id,
              seenCount: 1,
              completedInCycle: true,
            });
          }
          tx.addEventListener("complete", () => {
            db.close();
            resolve();
          });
          tx.addEventListener("error", () => reject(tx.error ?? new Error("seed failed")));
        });
        open.addEventListener("error", () => reject(open.error ?? new Error("open failed")));
      });
    }, laterIds);
    await page.reload();

    await completeQuiz(page, questions.slice(0, TOTAL_QUESTIONS), () => 0);
    await page.getByRole("button", { name: "Try again" }).press("Enter");
    await expect(
      page.getByText(
        `All ${questions.length} questions completed — your next quiz starts a fresh cycle.`,
      ),
    ).toBeVisible();

    // The fresh cycle serves the first manifest questions again.
    await completeQuiz(page, questions.slice(0, TOTAL_QUESTIONS), () => 0);
    await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
  });

  test("randomized mode plays every pool question once per round", async ({ page }) => {
    await page
      .locator("#quiz-root")
      .getByRole("radio", { name: /Randomized/ })
      .click({ force: true });

    // A randomized round draws ten from the 50-question pool in any order —
    // the helper matches each served question by heading against the full
    // manifest, so it plays whatever selection appears.
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
