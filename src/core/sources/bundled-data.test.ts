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

  test("contains exactly 10 questions, 2 per topic", () => {
    const index = v.parse(QuizIndexSchema, quizIndex);
    expect(index.questions).toHaveLength(10);
    for (const topic of TOPICS) {
      const count = index.questions.filter((q) => q.topic === topic).length;
      expect(count, `expected 2 questions for topic "${topic}"`).toBe(2);
    }
  });
});
