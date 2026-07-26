import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { QuizAttempt } from "@shared/schema";
import type { QuestionProgress } from "@/core/selection";

export const DB_NAME = "araowl";
// v2: adds the question-progress store (quiz size/mode selection work).
export const DB_VERSION = 2;

export interface AraowlDB extends DBSchema {
  attempts: {
    key: string;
    value: QuizAttempt;
    indexes: { finishedAt: string };
  };
  "question-progress": {
    key: string;
    value: QuestionProgress;
  };
}

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
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const attempts = database.createObjectStore("attempts", { keyPath: "id" });
        attempts.createIndex("finishedAt", "finishedAt");
      }
      if (oldVersion < 2) {
        database.createObjectStore("question-progress", { keyPath: "questionId" });
      }
    },
    blocking: hooks.blocking,
    terminated: hooks.terminated,
  });
}
