import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { DB_NAME } from "@/core/storage/araowl-db";
import { IdbProgressStore } from "@/core/storage/idb-progress-store";
import { IdbScoreStore } from "@/core/storage/idb-score-store";

function deleteDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.addEventListener("success", () => resolve());
    request.addEventListener("error", () => reject(request.error));
  });
}

/** Create the database at `version` running `upgrade`, then close it. */
function seedDb(version: number | undefined, upgrade?: (db: IDBDatabase) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request =
      version === undefined ? indexedDB.open(DB_NAME) : indexedDB.open(DB_NAME, version);
    if (upgrade) {
      request.addEventListener("upgradeneeded", () => upgrade(request.result));
    }
    request.addEventListener("success", () => {
      request.result.close();
      resolve();
    });
    request.addEventListener("error", () => reject(request.error));
  });
}

async function expectBothStoresWork(): Promise<void> {
  const scores = new IdbScoreStore();
  const progress = new IdbProgressStore();
  await expect(scores.listAttempts()).resolves.toEqual([]);
  await expect(progress.getProgress()).resolves.toEqual([]);
  scores.close();
  progress.close();
}

// Regression coverage for a production NotFoundError: the v2 migration
// guarded store creation on oldVersion, assuming a v1 database always holds
// the attempts store. A versionless indexedDB.open() on a fresh origin
// creates an EMPTY v1 database, after which the old guard skipped creation
// and every transaction threw. The upgrade now checks store presence.
describe("openAraowlDb healing", () => {
  beforeEach(async () => {
    await deleteDb();
  });

  it("heals an empty database created by a versionless open", async () => {
    await seedDb(undefined);
    await expectBothStoresWork();
  });

  it("heals a v2 database that is missing the attempts store", async () => {
    await seedDb(2, (db) => {
      db.createObjectStore("question-progress", { keyPath: "questionId" });
    });
    await expectBothStoresWork();
  });

  it("upgrades a healthy v1 database without losing the attempts store", async () => {
    await seedDb(1, (db) => {
      const attempts = db.createObjectStore("attempts", { keyPath: "id" });
      attempts.createIndex("finishedAt", "finishedAt");
    });
    await expectBothStoresWork();
  });
});
