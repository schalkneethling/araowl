import type { QuizIndex } from "@shared/schema";

/** A provider of quiz content (bundled JSON today, AI-generated later). */
export interface QuizSource {
  getQuiz(): Promise<QuizIndex>;
}
