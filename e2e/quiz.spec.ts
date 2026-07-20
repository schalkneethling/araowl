import { expect, test } from "@playwright/test";
import {
  completeQuiz,
  countStoredAttempts,
  loadQuizQuestions,
  resetClientState,
  startQuiz,
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

test.describe("quiz island", () => {
  test("plays a full quiz using only the keyboard", async ({ page }) => {
    await startQuiz(page);

    let expectedCorrect = 0;

    for (const [index, question] of questions.entries()) {
      const questionNumber = index + 1;
      await expect(
        page.getByText(`Question ${questionNumber} of ${TOTAL_QUESTIONS}`),
      ).toBeVisible();

      const heading = page.getByRole("heading", { name: question.question });
      await expect(heading).toBeVisible();
      if (index > 0) {
        // Advancing mounts the next card and moves focus to its h2.
        await expect(heading).toBeFocused();
      }

      // Peek at the first hint on every other question.
      if (index % 2 === 0) {
        await page
          .getByRole("button", { name: `Reveal hint 1/${question.hints.length}` })
          .press("Enter");
        await expect(page.getByText(question.hints[0] ?? "")).toBeVisible();
      }

      // Space selects the first option; each ArrowDown moves the selection on.
      // Scoped to #quiz-root: the header's theme switcher is also a radiogroup.
      const radios = page.locator("#quiz-root").getByRole("radio");
      await expect(radios).toHaveCount(4);
      const chosen = index % 4;
      await radios.first().press("Space");
      for (let step = 0; step < chosen; step++) {
        await page.keyboard.press("ArrowDown");
      }
      await expect(radios.nth(chosen)).toBeChecked();

      const correct = chosen === question.answerIndex;
      if (correct) {
        expectedCorrect += 1;
      }

      await page.getByRole("button", { name: "Check answer" }).press("Enter");

      await expect(
        page.getByText(correct ? "Correct" : "Incorrect", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(question.explanation)).toBeVisible();

      const mdnLink = page.getByRole("link", { name: /Read on MDN/ });
      await expect(mdnLink).toHaveAttribute("href", question.mdnUrl);
      await expect(mdnLink).toHaveAttribute("target", "_blank");
      await expect(mdnLink).toHaveAttribute("rel", "noopener");

      await page
        .getByRole("button", {
          name: questionNumber === TOTAL_QUESTIONS ? "See results" : "Next question",
        })
        .press("Enter");
    }

    await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
    await expect(
      page.getByText(`${expectedCorrect} / ${TOTAL_QUESTIONS}`, { exact: true }),
    ).toBeVisible();

    const bodyRows = page.getByRole("table").locator("tbody tr");
    await expect(bodyRows).toHaveCount(5);
    const totals = await bodyRows.locator("td:nth-child(3)").allInnerTexts();
    const sum = totals.reduce((acc, value) => acc + Number(value), 0);
    expect(sum).toBe(TOTAL_QUESTIONS);
  });

  test("scores an all-first-option run to match the bundled manifest", async ({ page }) => {
    const expectedScore = questions.filter((question) => question.answerIndex === 0).length;
    const htmlQuestions = questions.filter((question) => question.topic === "html");
    const expectedHtmlCorrect = htmlQuestions.filter(
      (question) => question.answerIndex === 0,
    ).length;

    await completeQuiz(page, questions, () => 0);

    await expect(
      page.getByText(`${expectedScore} / ${TOTAL_QUESTIONS}`, { exact: true }),
    ).toBeVisible();

    const htmlRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name: "HTML", exact: true }) });
    await expect(htmlRow.locator("td")).toHaveText([
      String(expectedHtmlCorrect),
      String(htmlQuestions.length),
    ]);
  });

  test("persists attempts to score history across reloads, newest first", async ({ page }) => {
    // First run: all correct -> 10 / 10.
    await completeQuiz(page, questions, (question) => question.answerIndex);
    await expect(page.getByText(`${TOTAL_QUESTIONS} / ${TOTAL_QUESTIONS}`)).toBeVisible();
    await expect.poll(() => countStoredAttempts(page)).toBe(1);

    await page.reload();

    // ScoreHistory renders an <aside>, exposed as the "complementary" landmark role.
    const history = page.getByRole("complementary", { name: "Past attempts" });
    const items = history.getByRole("listitem");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText(`${TOTAL_QUESTIONS} / ${TOTAL_QUESTIONS}`);
    // formatAttemptDate renders a medium date, which always includes the year.
    await expect(items.first()).toContainText(String(new Date().getFullYear()));

    // Second run: always one past the correct option -> 0 / 10.
    await completeQuiz(page, questions, (question) => (question.answerIndex + 1) % 4);
    await expect.poll(() => countStoredAttempts(page)).toBe(2);
    await page.getByRole("button", { name: "Try again" }).press("Enter");

    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText(`0 / ${TOTAL_QUESTIONS}`);
    await expect(items.nth(1)).toContainText(`${TOTAL_QUESTIONS} / ${TOTAL_QUESTIONS}`);
  });

  test("lays out the four options as separate, full-width, non-overlapping rows", async ({
    page,
  }) => {
    await startQuiz(page);

    // Scoped to #quiz-root: the header's theme switcher is also a radiogroup.
    const group = page.locator("#quiz-root").getByRole("radiogroup");
    const groupBox = await group.boundingBox();
    if (!groupBox) {
      throw new Error("radiogroup has no bounding box");
    }

    // Measure the rendered option rows (the labels); the role=radio inputs
    // themselves are visually hidden by React Aria.
    const rows = group.locator('[data-slot="radio-group-item"]');
    await expect(rows).toHaveCount(4);

    const boxes = [];
    for (let index = 0; index < 4; index++) {
      const box = await rows.nth(index).boundingBox();
      if (!box) {
        throw new Error(`option row ${index} has no bounding box`);
      }
      boxes.push(box);
    }

    for (const box of boxes) {
      // Real rows, not text squeezed into a 16px circle.
      expect(box.height).toBeGreaterThanOrEqual(24);
      expect(box.width).toBeGreaterThan(groupBox.width * 0.5);
    }

    // No vertical overlap: each row starts after the previous one ends.
    const sorted = boxes.toSorted((a, b) => a.y - b.y);
    for (let index = 1; index < sorted.length; index++) {
      const previous = sorted[index - 1];
      const currentRow = sorted[index];
      if (!previous || !currentRow) {
        throw new Error("missing bounding box");
      }
      expect(currentRow.y).toBeGreaterThanOrEqual(previous.y + previous.height - 1);
    }
  });

  test("hints stay revealed, exhaust their button, and reset per question", async ({ page }) => {
    const [first, second] = questions;
    if (!first || !second) {
      throw new Error("quiz manifest must have at least 2 questions");
    }

    await startQuiz(page);

    const available = Math.min(first.hints.length, 3);
    for (let hintNumber = 1; hintNumber <= available; hintNumber++) {
      await page
        .getByRole("button", { name: `Reveal hint ${hintNumber}/${available}` })
        .press("Enter");
      for (const hint of first.hints.slice(0, hintNumber)) {
        await expect(page.getByText(hint)).toBeVisible();
      }
    }

    // Every hint shown: the reveal button is gone, revealed hints remain.
    await expect(page.getByRole("button", { name: /Reveal hint/ })).toHaveCount(0);
    for (const hint of first.hints) {
      await expect(page.getByText(hint)).toBeVisible();
    }

    // Hints stay visible through the feedback phase.
    await page.locator("#quiz-root").getByRole("radio").first().press("Space");
    await page.getByRole("button", { name: "Check answer" }).press("Enter");
    for (const hint of first.hints) {
      await expect(page.getByText(hint)).toBeVisible();
    }
    await page.getByRole("button", { name: "Next question" }).press("Enter");

    // Question 2 starts from a clean hint state.
    await expect(page.getByText(`Question 2 of ${TOTAL_QUESTIONS}`)).toBeVisible();
    const secondAvailable = Math.min(second.hints.length, 3);
    await expect(
      page.getByRole("button", { name: `Reveal hint 1/${secondAvailable}` }),
    ).toBeVisible();

    for (const hint of first.hints) {
      await expect(page.getByText(hint)).toHaveCount(0);
    }

    await expect(page.locator(".quiz-hints__list")).toHaveCount(0);
  });
});
