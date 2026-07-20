import { describe, expect, it } from "vite-plus/test";
import { makeQuestion, makeQuizIndex } from "@shared/__fixtures__/quiz-fixtures";
import * as v from "valibot";
import {
  parseQuizIndex,
  QuizAttemptSchema,
  QuizIndexSchema,
  QuizQuestionSchema,
  safeParseQuizIndex,
} from "@shared/schema";

const ok = (data: unknown) => v.safeParse(QuizQuestionSchema, data).success;

describe("QuizQuestionSchema", () => {
  it("accepts a valid question", () => {
    expect(ok(makeQuestion())).toBe(true);
  });

  it("rejects an empty id", () => {
    expect(ok(makeQuestion({ id: "" }))).toBe(false);
  });

  it("rejects an unknown topic", () => {
    expect(ok(makeQuestion({ topic: "networking" as never }))).toBe(false);
  });

  it("rejects a question shorter than 10 characters", () => {
    expect(ok(makeQuestion({ question: "too short" }))).toBe(false);
  });

  it("rejects fewer than 4 options", () => {
    expect(ok(makeQuestion({ options: ["a", "b", "c"] }))).toBe(false);
  });

  it("rejects 5 options", () => {
    expect(ok(makeQuestion({ options: ["a", "b", "c", "d", "e"] }))).toBe(false);
  });

  it("rejects duplicate options", () => {
    expect(ok(makeQuestion({ options: ["a", "b", "b", "c"] }))).toBe(false);
  });

  it("rejects an empty option string", () => {
    expect(ok(makeQuestion({ options: ["a", "", "c", "d"] }))).toBe(false);
  });

  it("rejects answerIndex of 4 (out of range)", () => {
    expect(ok(makeQuestion({ answerIndex: 4 }))).toBe(false);
  });

  it("rejects a negative answerIndex", () => {
    expect(ok(makeQuestion({ answerIndex: -1 }))).toBe(false);
  });

  it("rejects a non-integer answerIndex", () => {
    expect(ok(makeQuestion({ answerIndex: 1.5 }))).toBe(false);
  });

  it("rejects 0 hints", () => {
    expect(ok(makeQuestion({ hints: [] }))).toBe(false);
  });

  it("rejects 4 hints", () => {
    expect(ok(makeQuestion({ hints: ["a", "b", "c", "d"] }))).toBe(false);
  });

  it("rejects an empty hint string", () => {
    expect(ok(makeQuestion({ hints: [""] }))).toBe(false);
  });

  it("rejects a hint shorter than 3 characters", () => {
    expect(ok(makeQuestion({ hints: ["ab"] }))).toBe(false);
  });

  it("rejects an empty explanation", () => {
    expect(ok(makeQuestion({ explanation: "" }))).toBe(false);
  });

  it("rejects a non-MDN url", () => {
    expect(ok(makeQuestion({ mdnUrl: "https://example.com/page" }))).toBe(false);
  });

  it("accepts 1, 2 and 3 hints", () => {
    expect(ok(makeQuestion({ hints: ["one"] }))).toBe(true);
    expect(ok(makeQuestion({ hints: ["one", "two"] }))).toBe(true);
    expect(ok(makeQuestion({ hints: ["one", "two", "three"] }))).toBe(true);
  });
});

describe("QuizIndexSchema", () => {
  it("parses a valid index", () => {
    const index = parseQuizIndex(makeQuizIndex());
    expect(index.questions).toHaveLength(1);
    expect(index.version).toBe(1);
  });

  it("rejects an empty questions array", () => {
    expect(v.safeParse(QuizIndexSchema, makeQuizIndex([])).success).toBe(false);
  });

  it("rejects a non-ISO generatedAt", () => {
    expect(
      v.safeParse(QuizIndexSchema, makeQuizIndex(undefined, { generatedAt: "not-a-date" })).success,
    ).toBe(false);
  });

  it("rejects an unknown source", () => {
    expect(
      v.safeParse(QuizIndexSchema, makeQuizIndex(undefined, { source: "remote" as never })).success,
    ).toBe(false);
  });

  it("safeParseQuizIndex reports failure without throwing", () => {
    const result = safeParseQuizIndex({ nope: true });
    expect(result.success).toBe(false);
  });

  it("parseQuizIndex throws on invalid data", () => {
    expect(() => parseQuizIndex({ nope: true })).toThrow(/./);
  });
});

describe("QuizAttemptSchema", () => {
  const validAttempt = {
    id: "a1",
    anonUserId: "u1",
    startedAt: "2026-07-19T00:00:00.000Z",
    finishedAt: "2026-07-19T00:05:00.000Z",
    source: "bundled" as const,
    topics: ["html", "css"] as const,
    answers: [{ questionId: "q1", chosenIndex: 0, correct: true, hintsUsed: 0 }],
    score: {
      correct: 1,
      total: 2,
      byTopic: { html: { correct: 1, total: 1 }, css: { correct: 0, total: 1 } },
    },
  };

  it("accepts a valid attempt", () => {
    expect(v.safeParse(QuizAttemptSchema, validAttempt).success).toBe(true);
  });

  it("rejects a total below 1", () => {
    expect(
      v.safeParse(QuizAttemptSchema, {
        ...validAttempt,
        score: { ...validAttempt.score, total: 0 },
      }).success,
    ).toBe(false);
  });

  it("rejects an out-of-range chosenIndex", () => {
    expect(
      v.safeParse(QuizAttemptSchema, {
        ...validAttempt,
        answers: [{ questionId: "q1", chosenIndex: 9, correct: true, hintsUsed: 0 }],
      }).success,
    ).toBe(false);
  });
});
