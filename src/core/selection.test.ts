import { describe, expect, it } from "vite-plus/test";
import type { QuizQuestion } from "@shared/schema";
import { isCycleExhausted, maxQuizSize, type QuestionProgress, selectQuestions } from "./selection";

function question(id: string): QuizQuestion {
  return {
    id,
    topic: "html",
    question: `Question ${id}?`,
    options: ["a", "b", "c", "d"],
    answerIndex: 0,
    hints: ["hint"],
    explanation: "Because.",
    mdnUrl: "https://developer.mozilla.org/",
  };
}

function progress(
  questionId: string,
  seenCount: number,
  completedInCycle = false,
): QuestionProgress {
  return { questionId, seenCount, completedInCycle };
}

const pool = ["q1", "q2", "q3", "q4", "q5"].map(question);

/** Deterministic rng: cycles through the provided values. */
function stubRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

describe("maxQuizSize", () => {
  it("rounds the pool down to full tens, never below the minimum", () => {
    expect(maxQuizSize(10)).toBe(10);
    expect(maxQuizSize(9)).toBe(10);
    expect(maxQuizSize(55)).toBe(50);
    expect(maxQuizSize(50)).toBe(50);
  });
});

describe("isCycleExhausted", () => {
  it("is true only when every pool question is completed this cycle", () => {
    const all = pool.map((q) => progress(q.id, 1, true));
    expect(isCycleExhausted(pool, all)).toBe(true);
    expect(isCycleExhausted(pool, all.slice(1))).toBe(false);
    expect(isCycleExhausted(pool, [])).toBe(false);
  });
});

describe("selectQuestions — sequential", () => {
  it("takes the first questions in manifest order when nothing is completed", () => {
    const picked = selectQuestions(pool, {
      size: 3,
      mode: "sequential",
      progress: [],
      rng: stubRng([0]),
    });
    expect(picked.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  });

  it("skips questions completed this cycle", () => {
    const picked = selectQuestions(pool, {
      size: 3,
      mode: "sequential",
      progress: [progress("q1", 1, true), progress("q3", 1, true)],
      rng: stubRng([0]),
    });
    expect(picked.map((q) => q.id)).toEqual(["q2", "q4", "q5"]);
  });

  it("yields a shorter final round when fewer questions remain", () => {
    const picked = selectQuestions(pool, {
      size: 10,
      mode: "sequential",
      progress: [progress("q1", 1, true), progress("q2", 1, true), progress("q3", 1, true)],
      rng: stubRng([0]),
    });
    expect(picked.map((q) => q.id)).toEqual(["q4", "q5"]);
  });
});

describe("selectQuestions — random", () => {
  it("prefers least-seen questions", () => {
    const picked = selectQuestions(pool, {
      size: 2,
      mode: "random",
      progress: [progress("q1", 5), progress("q2", 5), progress("q3", 5)],
      rng: stubRng([0.5]),
    });
    // q4 and q5 have never been seen — they must win over the seen ones.
    expect(picked.map((q) => q.id).toSorted()).toEqual(["q4", "q5"]);
  });

  it("breaks seen-count ties with the injected rng", () => {
    const ascending = selectQuestions(pool, {
      size: 2,
      mode: "random",
      progress: [],
      rng: stubRng([0.9, 0.1, 0.8, 0.2, 0.5]),
    });
    // Tiebreaks: q2 (0.1) then q4 (0.2).
    expect(ascending.map((q) => q.id)).toEqual(["q2", "q4"]);
  });

  it("never selects more than the pool", () => {
    const picked = selectQuestions(pool, {
      size: 50,
      mode: "random",
      progress: [],
      rng: stubRng([0.5]),
    });
    expect(picked).toHaveLength(pool.length);
  });
});
