import type { QuizQuestion } from "@shared/schema";

export type QuizMode = "sequential" | "random";

/** Per-question usage record; one row per question the user has played. */
export type QuestionProgress = {
  questionId: string;
  /** Times the question has appeared in any completed quiz. */
  seenCount: number;
  /** Completed during the current sequential cycle (cleared on reset). */
  completedInCycle: boolean;
};

export const MIN_QUIZ_SIZE = 10;
export const QUIZ_SIZE_STEP = 10;

/** Largest selectable size for a pool: full tens, never below the minimum. */
export function maxQuizSize(poolSize: number): number {
  return Math.max(MIN_QUIZ_SIZE, Math.floor(poolSize / QUIZ_SIZE_STEP) * QUIZ_SIZE_STEP);
}

/** True when every pool question has been completed this sequential cycle. */
export function isCycleExhausted(pool: QuizQuestion[], progress: QuestionProgress[]): boolean {
  const completed = new Set(
    progress.filter((entry) => entry.completedInCycle).map((entry) => entry.questionId),
  );
  return pool.length > 0 && pool.every((question) => completed.has(question.id));
}

/**
 * Choose the questions for a round. Pure: persistence and cycle resets are
 * the caller's job (reset before calling when `isCycleExhausted`).
 *
 * - sequential: manifest order, skipping questions completed this cycle; a
 *   shrinking remainder yields a shorter final round.
 * - random: least-seen first with an injected-rng tiebreak — balances
 *   repetition without forbidding it.
 */
export function selectQuestions(
  pool: QuizQuestion[],
  opts: {
    size: number;
    mode: QuizMode;
    progress: QuestionProgress[];
    rng: () => number;
  },
): QuizQuestion[] {
  const byId = new Map(opts.progress.map((entry) => [entry.questionId, entry]));

  if (opts.mode === "sequential") {
    const remaining = pool.filter((question) => !byId.get(question.id)?.completedInCycle);
    return remaining.slice(0, opts.size);
  }

  return pool
    .map((question) => ({
      question,
      seenCount: byId.get(question.id)?.seenCount ?? 0,
      tiebreak: opts.rng(),
    }))
    .sort((a, b) => a.seenCount - b.seenCount || a.tiebreak - b.tiebreak)
    .slice(0, opts.size)
    .map((entry) => entry.question);
}
