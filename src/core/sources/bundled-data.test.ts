import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vite-plus/test";
import { TOPICS } from "@shared/topics";
import { QuizIndexSchema } from "@shared/schema";
import * as v from "valibot";

const dataUrl = new URL("../../../public/data/quiz-index.json", import.meta.url);
const dataPath = fileURLToPath(dataUrl);
const exists = existsSync(dataPath);

// Skips until the content agent lands public/data/quiz-index.json.
describe("bundled quiz-index.json on disk", () => {
  test.skipIf(!exists)("validates against QuizIndexSchema", () => {
    const raw = JSON.parse(readFileSync(dataPath, "utf8"));
    const result = v.safeParse(QuizIndexSchema, raw);
    expect(result.success).toBe(true);
  });

  test.skipIf(!exists)("contains exactly 10 questions, 2 per topic", () => {
    const index = v.parse(QuizIndexSchema, JSON.parse(readFileSync(dataPath, "utf8")));
    expect(index.questions).toHaveLength(10);
    for (const topic of TOPICS) {
      const count = index.questions.filter((q) => q.topic === topic).length;
      expect(count, `expected 2 questions for topic "${topic}"`).toBe(2);
    }
  });
});
