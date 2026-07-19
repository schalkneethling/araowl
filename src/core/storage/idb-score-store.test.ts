import "fake-indexeddb/auto";
import { describe, expect, it } from "vite-plus/test";
import type { QuizAttempt } from "@shared/schema";
import { IdbScoreStore } from "@/core/storage/idb-score-store";

const DB_NAME = "araowl";

const attempt: QuizAttempt = {
  id: "a1",
  anonUserId: "u1",
  startedAt: "2026-07-19T00:00:00.000Z",
  finishedAt: "2026-07-19T00:05:00.000Z",
  source: "bundled",
  topics: ["html"],
  answers: [{ questionId: "q1", chosenIndex: 0, correct: true, hintsUsed: 0 }],
  score: { correct: 1, total: 1, byTopic: { html: { correct: 1, total: 1 } } },
};

function deleteDatabase(): Promise<{ wasBlocked: boolean }> {
  return new Promise((resolve, reject) => {
    let wasBlocked = false;
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onblocked = () => {
      wasBlocked = true;
    };
    request.onsuccess = () => {
      resolve({ wasBlocked });
    };
    request.onerror = () => {
      reject(request.error ?? new Error("deleteDatabase failed"));
    };
  });
}

describe("IdbScoreStore connection lifecycle", () => {
  it("releases its held connection on versionchange so deleteDatabase completes", async () => {
    const store = new IdbScoreStore();
    await store.saveAttempt(attempt);

    // The store still holds an open connection here. Without the blocking
    // handler closing it, this delete would stay "blocked" forever and the
    // test would time out.
    await deleteDatabase();

    // The database really was deleted: a fresh store sees no attempts.
    const freshStore = new IdbScoreStore();
    expect(await freshStore.listAttempts()).toEqual([]);
    freshStore.close();
  });

  it("close() releases the connection so a subsequent delete is not blocked", async () => {
    const store = new IdbScoreStore();
    await store.saveAttempt(attempt);

    store.close();
    // close() resolves the cached open-promise before closing; give that
    // microtask chain a beat to finish.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const { wasBlocked } = await deleteDatabase();
    expect(wasBlocked).toBe(false);
  });

  it("reopens transparently after close()", async () => {
    const store = new IdbScoreStore();
    await store.saveAttempt(attempt);
    store.close();

    expect(await store.listAttempts()).toEqual([attempt]);
    await store.clear();
  });
});
