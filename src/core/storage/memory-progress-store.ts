import type { QuestionProgress } from "@/core/selection";
import type { ProgressStore } from "@/core/storage/progress-store";

/** In-memory ProgressStore for tests. */
export class MemoryProgressStore implements ProgressStore {
  private readonly rows = new Map<string, QuestionProgress>();

  getProgress(): Promise<QuestionProgress[]> {
    return Promise.resolve([...this.rows.values()].map((row) => structuredClone(row)));
  }

  recordSeen(questionIds: string[], opts: { completeInCycle: boolean }): Promise<void> {
    for (const questionId of questionIds) {
      const existing = this.rows.get(questionId);
      this.rows.set(questionId, {
        questionId,
        seenCount: (existing?.seenCount ?? 0) + 1,
        completedInCycle: opts.completeInCycle || (existing?.completedInCycle ?? false),
      });
    }
    return Promise.resolve();
  }

  resetCycle(): Promise<void> {
    for (const row of this.rows.values()) {
      row.completedInCycle = false;
    }
    return Promise.resolve();
  }
}
