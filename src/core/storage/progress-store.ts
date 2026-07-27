import type { QuestionProgress } from "@/core/selection";

/**
 * Persistence seam for per-question usage tracking (quiz selection modes).
 * Interface-first like ScoreStore: the app depends only on this contract.
 */
export interface ProgressStore {
  /** All recorded progress rows (absent questions have simply never been seen). */
  getProgress(): Promise<QuestionProgress[]>;
  /**
   * Record that these questions were played in a completed quiz: increments
   * each `seenCount`, and marks `completedInCycle` when `completeInCycle`
   * is set (sequential mode).
   */
  recordSeen(questionIds: string[], opts: { completeInCycle: boolean }): Promise<void>;
  /** Start a fresh sequential cycle: clear all `completedInCycle` flags, keep counts. */
  resetCycle(): Promise<void>;
  /** Release held resources (e.g. an open database connection). Optional. */
  close?(): void;
}
