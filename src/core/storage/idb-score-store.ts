import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { QuizAttempt } from "@shared/schema";
import type { ScoreStore } from "@/core/storage/score-store";

const DB_NAME = "araowl";
const DB_VERSION = 1;
const STORE = "attempts";

interface AraowlDB extends DBSchema {
  attempts: {
    key: string;
    value: QuizAttempt;
    indexes: { finishedAt: string };
  };
}

/** IndexedDB-backed ScoreStore. Keyed by attempt id, ordered via a finishedAt index. */
export class IdbScoreStore implements ScoreStore {
  private dbPromise: Promise<IDBPDatabase<AraowlDB>> | undefined;

  private db(): Promise<IDBPDatabase<AraowlDB>> {
    this.dbPromise ??= openDB<AraowlDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const store = database.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("finishedAt", "finishedAt");
      },
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

  async clear(): Promise<void> {
    const db = await this.db();
    await db.clear(STORE);
  }
}
