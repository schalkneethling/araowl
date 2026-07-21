import fs from "node:fs/promises";
import { formatFullReport } from "@schalkneethling/axe-aggregate-reporter";
import type { AxeBuilder } from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";
import { expect, test } from "./fixtures/axe.ts";
import {
  completeQuiz,
  loadQuizQuestions,
  resetClientState,
  startQuiz,
  type QuizQuestionData,
} from "./helpers/quiz.ts";

let questions: QuizQuestionData[];

test.beforeAll(async () => {
  questions = await loadQuizQuestions();
});

test.beforeEach(async ({ page }) => {
  await resetClientState(page);
});

/** Scan the current page, attach the formatted report, assert zero violations. */
async function expectAccessible(
  makeAxeBuilder: () => AxeBuilder,
  testInfo: TestInfo,
): Promise<void> {
  const results = await makeAxeBuilder().analyze();
  const file = testInfo.outputPath("axe.json");

  await fs.writeFile(file, JSON.stringify(formatFullReport(results), null, 2));
  await testInfo.attach("axe.json", {
    contentType: "application/json",
    path: file,
  });

  expect(results.violations).toEqual([]);
}

/** Seed one finished attempt directly into IndexedDB so history renders rows. */
async function seedAttempt(page: Page): Promise<void> {
  await page.evaluate(() => {
    const now = new Date();
    const attempt = {
      id: "a11y-seeded-attempt",
      anonUserId: "a11y-seed-user",
      startedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      finishedAt: now.toISOString(),
      source: "bundled",
      topics: ["html", "css", "javascript", "web-apis", "accessibility"],
      answers: [],
      score: {
        correct: 7,
        total: 10,
        byTopic: {
          html: { correct: 2, total: 2 },
          css: { correct: 1, total: 2 },
          javascript: { correct: 2, total: 2 },
          "web-apis": { correct: 1, total: 2 },
          accessibility: { correct: 1, total: 2 },
        },
      },
    };
    return new Promise<void>((resolve, reject) => {
      // Mirrors IdbScoreStore's schema: keyPath "id", index "finishedAt".
      const open = indexedDB.open("araowl", 1);
      open.addEventListener("upgradeneeded", () => {
        const store = open.result.createObjectStore("attempts", { keyPath: "id" });
        store.createIndex("finishedAt", "finishedAt");
      });
      open.addEventListener("success", () => {
        const db = open.result;
        const tx = db.transaction("attempts", "readwrite");
        tx.objectStore("attempts").put(attempt);
        tx.addEventListener("complete", () => {
          db.close();
          resolve();
        });
        tx.addEventListener("error", () => {
          db.close();
          reject(tx.error ?? new Error("seedAttempt transaction failed"));
        });
      });
      open.addEventListener("error", () =>
        reject(open.error ?? new Error("seedAttempt open failed")),
      );
    });
  });
}

test("start view with score history has no violations", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await seedAttempt(page);
  await page.reload();
  await expect(page.getByText("7 / 10", { exact: true })).toBeVisible();

  await expectAccessible(makeAxeBuilder, testInfo);
});

test("active question with hints and feedback has no violations", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  const first = questions[0];
  if (!first) {
    throw new Error("quiz manifest must have at least 1 question");
  }

  await startQuiz(page);

  const available = Math.min(first.hints.length, 3);
  for (let hintNumber = 1; hintNumber <= available; hintNumber++) {
    await page
      .getByRole("button", { name: `Reveal hint ${hintNumber}/${available}` })
      .press("Enter");
  }
  for (const hint of first.hints) {
    await expect(page.getByText(hint)).toBeVisible();
  }

  // Scoped to #quiz-root: the header's theme switcher is also a radiogroup.
  await page.locator("#quiz-root").getByRole("radio").first().press("Space");
  await page.getByRole("button", { name: "Check answer" }).press("Enter");
  await expect(page.getByText(/^(Correct|Incorrect)$/)).toBeVisible();

  await expectAccessible(makeAxeBuilder, testInfo);
});

test("results view has no violations", async ({ page, makeAxeBuilder }, testInfo) => {
  await completeQuiz(page, questions, (question) => question.answerIndex);
  await expect(page.getByText("10 / 10", { exact: true })).toBeVisible();

  await expectAccessible(makeAxeBuilder, testInfo);
});
