import type { IDBPDatabase } from "idb";
import type { QuestionProgress } from "@/core/selection";
import { type AraowlDB, openAraowlDb } from "@/core/storage/araowl-db";
import type { ProgressStore } from "@/core/storage/progress-store";

const STORE = "question-progress";

/** IndexedDB-backed ProgressStore; connection lifecycle mirrors IdbScoreStore. */
export class IdbProgressStore implements ProgressStore {
  private dbPromise: Promise<IDBPDatabase<AraowlDB>> | undefined;

  private db(): Promise<IDBPDatabase<AraowlDB>> {
    this.dbPromise ??= openAraowlDb({
      blocking: () => {
        this.close();
      },
      terminated: () => {
        this.dbPromise = undefined;
      },
    }).catch((error: unknown) => {
      this.dbPromise = undefined;
      throw error;
    });
    return this.dbPromise;
  }

  close(): void {
    const pending = this.dbPromise;
    this.dbPromise = undefined;
    void pending?.then((db) => {
      db.close();
    });
  }

  async getProgress(): Promise<QuestionProgress[]> {
    const db = await this.db();
    return db.getAll(STORE);
  }

  async recordSeen(questionIds: string[], opts: { completeInCycle: boolean }): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, "readwrite");
    for (const questionId of questionIds) {
      const existing = await tx.store.get(questionId);
      await tx.store.put({
        questionId,
        seenCount: (existing?.seenCount ?? 0) + 1,
        completedInCycle: opts.completeInCycle || (existing?.completedInCycle ?? false),
      });
    }
    await tx.done;
  }

  async resetCycle(): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, "readwrite");
    let cursor = await tx.store.openCursor();
    while (cursor) {
      await cursor.update({ ...cursor.value, completedInCycle: false });
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}
