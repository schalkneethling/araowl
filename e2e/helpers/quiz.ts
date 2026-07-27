import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";

export interface QuizQuestionData {
  id: string;
  topic: "html" | "css" | "javascript" | "web-apis" | "accessibility";
  question: string;
  options: string[];
  answerIndex: number;
  hints: string[];
  explanation: string;
  mdnUrl: string;
}

export const TOTAL_QUESTIONS = 10;

/** Read the bundled quiz manifest so tests can compute expected outcomes. */
export async function loadQuizQuestions(): Promise<QuizQuestionData[]> {
  const raw = await readFile("public/data/quiz-index.json", "utf-8");
  const parsed = JSON.parse(raw) as { questions: QuizQuestionData[] };
  return parsed.questions;
}

/**
 * Wipe client state (IndexedDB attempts, localStorage anon id) and reload.
 * The app keeps an IndexedDB connection open, so deleteDatabase reports
 * "blocked"; the deletion then completes during the reload below, before the
 * fresh document reopens the database (open requests queue behind deletes).
 */
export async function resetClientState(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    // Seed a declined analytics choice so the consent banner stays out of
    // specs that exercise other surfaces (and out of their VRT baselines);
    // the banner has its own dedicated spec and VRT states.
    localStorage.setItem("araowl:analytics-consent:v1", "denied");
    return new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase("araowl");
      request.addEventListener("success", () => resolve());
      request.addEventListener("error", () => resolve());
      request.addEventListener("blocked", () => resolve());
    });
  });
  await page.reload();
}

/** Start the quiz from the start view and wait for question 1. */
export async function startQuiz(page: Page, total: number = TOTAL_QUESTIONS): Promise<void> {
  await page.getByRole("button", { name: "Start quiz" }).press("Enter");
  await expect(page.getByText(`Question 1 of ${total}`)).toBeVisible();
}

/**
 * Play a full quiz, choosing pickIndex(question) on every question, and wait
 * for the results view. Relies on questions rendering in manifest order
 * (the engine does not shuffle); the heading assertion below catches any
 * future reordering loudly instead of misattributing answers.
 */
export async function completeQuiz(
  page: Page,
  questions: QuizQuestionData[],
  pickIndex: (question: QuizQuestionData) => number,
): Promise<void> {
  await startQuiz(page);
  for (const [index, question] of questions.entries()) {
    await expect(page.getByText(`Question ${index + 1} of ${questions.length}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: question.question })).toBeVisible();

    const chosen = pickIndex(question);
    // Scoped to #quiz-root: the header's theme switcher is also a radiogroup.
    await page
      .locator("#quiz-root")
      .getByRole("radio", { name: question.options[chosen] ?? "" })
      .press("Space");
    await page.getByRole("button", { name: "Check answer" }).press("Enter");

    const isLast = index === questions.length - 1;
    await page
      .getByRole("button", { name: isLast ? "See results" : "Next question" })
      .press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
}

/**
 * Play a full quiz without assuming question order (randomized mode): each
 * round, the current question is identified by its heading text and answered
 * with pickIndex(question). `total` is how many questions the round has.
 */
export async function completeQuizAnyOrder(
  page: Page,
  questions: QuizQuestionData[],
  total: number,
  pickIndex: (question: QuizQuestionData) => number,
): Promise<void> {
  await startQuiz(page, total);
  for (let number = 1; number <= total; number++) {
    await expect(page.getByText(`Question ${number} of ${total}`)).toBeVisible();
    const headingText = await page
      .locator("#quiz-root")
      .getByRole("heading", { level: 2 })
      .first()
      .innerText();
    const question = questions.find((candidate) => candidate.question === headingText.trim());
    if (!question) {
      throw new Error(`No manifest question matches heading: ${headingText}`);
    }

    const chosen = pickIndex(question);
    await page
      .locator("#quiz-root")
      .getByRole("radio", { name: question.options[chosen] ?? "" })
      .press("Space");
    await page.getByRole("button", { name: "Check answer" }).press("Enter");
    await page
      .getByRole("button", { name: number === total ? "See results" : "Next question" })
      .press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
}

/**
 * Read every row of one araowl object store inside the page. Missing
 * database, missing store, or any request error resolves to an empty array —
 * counters built on this keep their zero-on-missing/error behavior.
 */
function readAllRows(page: Page, storeName: string): Promise<unknown[]> {
  return page.evaluate((store) => {
    return new Promise<unknown[]>((resolve) => {
      const open = indexedDB.open("araowl");
      open.addEventListener("success", () => {
        const db = open.result;
        if (!db.objectStoreNames.contains(store)) {
          db.close();
          resolve([]);
          return;
        }
        const request = db.transaction(store, "readonly").objectStore(store).getAll();
        request.addEventListener("success", () => {
          db.close();
          resolve(request.result as unknown[]);
        });
        request.addEventListener("error", () => {
          db.close();
          resolve([]);
        });
      });
      open.addEventListener("error", () => resolve([]));
    });
  }, storeName);
}

/** Count question-progress rows marked completed this cycle (0 when absent). */
export async function countCycleCompleted(page: Page): Promise<number> {
  const rows = (await readAllRows(page, "question-progress")) as {
    completedInCycle?: boolean;
  }[];
  return rows.filter((row) => row.completedInCycle).length;
}

/** Count attempts currently persisted in IndexedDB (0 when the DB is absent). */
export async function countStoredAttempts(page: Page): Promise<number> {
  return (await readAllRows(page, "attempts")).length;
}
