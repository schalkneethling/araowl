import { describe, expect, test } from "vite-plus/test";
import { TOPICS } from "@shared/topics";
import { QuizIndexSchema } from "@shared/schema";
import * as v from "valibot";
import quizIndex from "../../../public/data/quiz-index.json" with { type: "json" };

describe("bundled quiz-index.json on disk", () => {
  test("validates against QuizIndexSchema", () => {
    const result = v.safeParse(QuizIndexSchema, quizIndex);
    expect(result.success).toBe(true);
  });

  test("contains exactly 50 questions with the launch topic weighting", () => {
    const index = v.parse(QuizIndexSchema, quizIndex);
    expect(index.questions).toHaveLength(50);
    // Weighted split decided for launch (JS/CSS heavy).
    const expected: Record<string, number> = {
      javascript: 14,
      css: 12,
      "web-apis": 10,
      html: 8,
      accessibility: 6,
    };
    for (const topic of TOPICS) {
      const count = index.questions.filter((q) => q.topic === topic).length;
      expect(count, `question count for topic "${topic}"`).toBe(expected[topic]);
    }
  });

  test("question ids are unique", () => {
    const index = v.parse(QuizIndexSchema, quizIndex);
    const ids = index.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every sequential 10-question window spans at least 4 topics", () => {
    // Sequential mode serves the manifest in order; interleaving topics keeps
    // every round varied instead of drilling one subject at a time.
    const index = v.parse(QuizIndexSchema, quizIndex);
    for (let start = 0; start < index.questions.length; start += 10) {
      const window = index.questions.slice(start, start + 10);
      const topics = new Set(window.map((q) => q.topic));
      expect(topics.size, `window starting at ${start}`).toBeGreaterThanOrEqual(4);
    }
  });
});
