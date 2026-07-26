import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import type { QuizAttempt } from "@shared/schema";
import type { ScoreStore } from "@/core/storage/score-store";
import { IdbScoreStore } from "@/core/storage/idb-score-store";
import { MemoryScoreStore } from "@/core/storage/memory-score-store";

function attempt(id: string, finishedAt: string): QuizAttempt {
  return {
    id,
    anonUserId: "u1",
    startedAt: "2026-07-19T00:00:00.000Z",
    finishedAt,
    source: "bundled",
    topics: ["html"],
    answers: [{ questionId: "q1", chosenIndex: 0, correct: true, hintsUsed: 0 }],
    score: { correct: 1, total: 1, byTopic: { html: { correct: 1, total: 1 } } },
  };
}

const factories: Array<[string, () => ScoreStore]> = [
  ["MemoryScoreStore", () => new MemoryScoreStore()],
  ["IdbScoreStore", () => new IdbScoreStore()],
];

describe.each(factories)("%s (ScoreStore contract)", (_name, create) => {
  let store: ScoreStore;

  beforeEach(async () => {
    store = create();
    await store.clear();
  });

  it("starts empty", async () => {
    expect(await store.listAttempts()).toEqual([]);
  });

  it("saves and lists an attempt", async () => {
    const a = attempt("a1", "2026-07-19T00:05:00.000Z");
    await store.saveAttempt(a);
    expect(await store.listAttempts()).toEqual([a]);
  });

  it("lists attempts newest-first by finishedAt", async () => {
    await store.saveAttempt(attempt("old", "2026-07-19T00:01:00.000Z"));
    await store.saveAttempt(attempt("new", "2026-07-19T00:09:00.000Z"));
    await store.saveAttempt(attempt("mid", "2026-07-19T00:05:00.000Z"));
    const ids = (await store.listAttempts()).map((a) => a.id);
    expect(ids).toEqual(["new", "mid", "old"]);
  });

  it("upserts by id", async () => {
    await store.saveAttempt(attempt("a1", "2026-07-19T00:01:00.000Z"));
    await store.saveAttempt(attempt("a1", "2026-07-19T00:09:00.000Z"));
    const list = await store.listAttempts();
    expect(list).toHaveLength(1);
    expect(list[0].finishedAt).toBe("2026-07-19T00:09:00.000Z");
  });

  it("clears all attempts", async () => {
    await store.saveAttempt(attempt("a1", "2026-07-19T00:01:00.000Z"));
    await store.clear();
    expect(await store.listAttempts()).toEqual([]);
  });

  it("deletes only the targeted attempt", async () => {
    await store.saveAttempt(attempt("keep", "2026-07-19T00:01:00.000Z"));
    await store.saveAttempt(attempt("remove", "2026-07-19T00:05:00.000Z"));

    await store.deleteAttempt("remove");

    const ids = (await store.listAttempts()).map((a) => a.id);
    expect(ids).toEqual(["keep"]);
  });

  it("treats deleting a nonexistent id as a no-op", async () => {
    await store.saveAttempt(attempt("a1", "2026-07-19T00:01:00.000Z"));

    await store.deleteAttempt("missing");

    expect(await store.listAttempts()).toHaveLength(1);
  });
});
