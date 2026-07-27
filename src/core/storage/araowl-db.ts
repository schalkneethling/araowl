import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { QuizAttempt } from "@shared/schema";
import type { QuestionProgress } from "@/core/selection";

export const DB_NAME = "araowl";
// v2 added the question-progress store; v3 exists to re-run the (now
// self-healing) upgrade on databases left in a broken state by the v2
// migration's oldVersion-based guards — see openAraowlDb.
export const DB_VERSION = 3;

export type AraowlDB = DBSchema & {
  attempts: {
    key: string;
    value: QuizAttempt;
    indexes: { finishedAt: string };
  };
  "question-progress": {
    key: string;
    value: QuestionProgress;
  };
};

/**
 * Single source of truth for the database schema. Every store class opens
 * through this function so the version number and upgrade path can never
 * diverge between stores sharing the database.
 */
export function openAraowlDb(hooks: {
  blocking: () => void;
  terminated: () => void;
}): Promise<IDBPDatabase<AraowlDB>> {
  return openDB<AraowlDB>(DB_NAME, DB_VERSION, {
    // Guards check store PRESENCE, never oldVersion: a versionless
    // indexedDB.open() on a fresh origin creates an EMPTY database at
    // version 1, and storage eviction or interrupted upgrades can leave
    // similar states. oldVersion-based guards then skip creation and every
    // later transaction throws NotFoundError (seen in production via
    // Sentry). Presence checks make the upgrade self-healing for any
    // starting state.
    upgrade(database) {
      if (!database.objectStoreNames.contains("attempts")) {
        const attempts = database.createObjectStore("attempts", { keyPath: "id" });
        attempts.createIndex("finishedAt", "finishedAt");
      }
      if (!database.objectStoreNames.contains("question-progress")) {
        database.createObjectStore("question-progress", { keyPath: "questionId" });
      }
    },
    blocking: hooks.blocking,
    terminated: hooks.terminated,
  });
}
