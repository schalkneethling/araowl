import { describe, expect, it } from "vite-plus/test";
import { makeQuestion, threeQuestions } from "@shared/__fixtures__/quiz-fixtures";
import * as v from "valibot";
import { QuizAttemptSchema } from "@shared/schema";
import { advance, answerQuestion, createQuizState } from "@/core/engine";
import { buildAttempt, computeScore } from "@/core/scoring";

function playThrough(chosenIndexes: number[]) {
  let state = createQuizState(threeQuestions, { source: "bundled" });
  for (const choice of chosenIndexes) {
    state = answerQuestion(state, choice);
    state = advance(state);
  }
  return state;
}

describe("computeScore", () => {
  it("counts totals and per-topic breakdown", () => {
    // q1 html correct, q2 css wrong, q3 html correct.
    const state = playThrough([0, 0, 1]);
    const score = computeScore(state.questions, state.answers);
    expect(score).toEqual({
      correct: 2,
      total: 3,
      byTopic: {
        html: { correct: 2, total: 2 },
        css: { correct: 0, total: 1 },
      },
    });
  });

  it("only includes topics present in the quiz", () => {
    const state = playThrough([0, 2, 1]); // all correct
    const score = computeScore(state.questions, state.answers);
    expect(Object.keys(score.byTopic).sort()).toEqual(["css", "html"]);
    expect(score.correct).toBe(3);
  });

  it("handles a single-topic quiz", () => {
    const questions = [
      makeQuestion({ id: "a", topic: "css", answerIndex: 0 }),
      makeQuestion({ id: "b", topic: "css", answerIndex: 1 }),
    ];
    let state = createQuizState(questions, { source: "bundled" });
    state = advance(answerQuestion(state, 0)); // correct
    state = advance(answerQuestion(state, 0)); // wrong
    const score = computeScore(state.questions, state.answers);
    expect(score).toEqual({
      correct: 1,
      total: 2,
      byTopic: { css: { correct: 1, total: 2 } },
    });
  });
});

describe("buildAttempt", () => {
  it("produces an attempt that validates against QuizAttemptSchema", () => {
    const state = playThrough([0, 0, 1]);
    const attempt = buildAttempt(state, {
      anonUserId: "user-123",
      finishedAt: "2026-07-19T00:05:00.000Z",
    });
    expect(v.safeParse(QuizAttemptSchema, attempt).success).toBe(true);
    expect(attempt.anonUserId).toBe("user-123");
    expect(attempt.finishedAt).toBe("2026-07-19T00:05:00.000Z");
    expect(attempt.startedAt).toBe(state.startedAt);
    expect(attempt.source).toBe("bundled");
    expect(attempt.topics.sort()).toEqual(["css", "html"]);
    expect(attempt.answers).toHaveLength(3);
    expect(attempt.score.correct).toBe(2);
    expect(attempt.id).toBeTruthy();
  });

  it("generates a unique id per attempt", () => {
    const state = playThrough([0, 0, 1]);
    const opts = { anonUserId: "u", finishedAt: "2026-07-19T00:05:00.000Z" };
    const a = buildAttempt(state, opts);
    const b = buildAttempt(state, opts);
    expect(a.id).not.toBe(b.id);
  });
});
