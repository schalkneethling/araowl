import type { QuizAttempt } from "@shared/schema";
import type { ScoreStore } from "@/core/storage/score-store";

/** In-memory ScoreStore for tests and the future CLI. */
export class MemoryScoreStore implements ScoreStore {
  private readonly attempts = new Map<string, QuizAttempt>();

  saveAttempt(attempt: QuizAttempt): Promise<void> {
    this.attempts.set(attempt.id, structuredClone(attempt));
    return Promise.resolve();
  }

  listAttempts(): Promise<QuizAttempt[]> {
    const sorted = [...this.attempts.values()].sort((a, b) =>
      b.finishedAt.localeCompare(a.finishedAt),
    );
    return Promise.resolve(sorted);
  }

  deleteAttempt(id: string): Promise<void> {
    this.attempts.delete(id);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.attempts.clear();
    return Promise.resolve();
  }
}
