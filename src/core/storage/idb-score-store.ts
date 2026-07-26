import type { IDBPDatabase } from "idb";
import type { QuizAttempt } from "@shared/schema";
import { type AraowlDB, openAraowlDb } from "@/core/storage/araowl-db";
import type { ScoreStore } from "@/core/storage/score-store";

const STORE = "attempts";

/** IndexedDB-backed ScoreStore. Keyed by attempt id, ordered via a finishedAt index. */
export class IdbScoreStore implements ScoreStore {
  private dbPromise: Promise<IDBPDatabase<AraowlDB>> | undefined;

  private db(): Promise<IDBPDatabase<AraowlDB>> {
    // Schema/versioning lives in araowl-db.ts, shared with IdbProgressStore.
    this.dbPromise ??= openAraowlDb({
      // Another context (tab, test, devtools) wants to upgrade or delete the
      // database: release our connection so their request isn't left blocked.
      blocking: () => {
        this.close();
      },
      // The browser terminated the connection abnormally; drop the cached
      // promise so the next operation reopens cleanly.
      terminated: () => {
        this.dbPromise = undefined;
      },
    }).catch((error: unknown) => {
      // A failed open must not be cached forever — clear it so the next
      // call retries instead of replaying the same rejection indefinitely.
      this.dbPromise = undefined;
      throw error;
    });
    return this.dbPromise;
  }

  /** Close the underlying connection; the next operation reopens it. */
  close(): void {
    const pending = this.dbPromise;
    this.dbPromise = undefined;
    void pending?.then((db) => {
      db.close();
    });
  }

  async saveAttempt(attempt: QuizAttempt): Promise<void> {
    const db = await this.db();
    await db.put(STORE, attempt);
  }

  async listAttempts(): Promise<QuizAttempt[]> {
    const db = await this.db();
    // Index yields ascending finishedAt; reverse for newest-first.
    const ascending = await db.getAllFromIndex(STORE, "finishedAt");
    return ascending.reverse();
  }

  async deleteAttempt(id: string): Promise<void> {
    const db = await this.db();
    await db.delete(STORE, id);
  }

  async clear(): Promise<void> {
    const db = await this.db();
    await db.clear(STORE);
  }
}
