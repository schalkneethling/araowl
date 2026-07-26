import type { QuizAttempt } from "@shared/schema";

/**
 * Persistence seam for quiz attempts. The interface is the extension point for
 * a future remote database; the app depends only on this contract.
 */
export interface ScoreStore {
  /** Persist a single attempt (upsert by `id`). */
  saveAttempt(attempt: QuizAttempt): Promise<void>;
  /** All attempts, newest first (by `finishedAt`). */
  listAttempts(): Promise<QuizAttempt[]>;
  /** Remove one attempt by `id`; unknown ids are a no-op. */
  deleteAttempt(id: string): Promise<void>;
  /** Remove every stored attempt. */
  clear(): Promise<void>;
  /** Release held resources (e.g. an open database connection). Optional. */
  close?(): void;
}
