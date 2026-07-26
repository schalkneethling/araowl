import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import type { ProgressStore } from "@/core/storage/progress-store";
import { IdbProgressStore } from "@/core/storage/idb-progress-store";
import { MemoryProgressStore } from "@/core/storage/memory-progress-store";

const factories: Array<[string, () => ProgressStore]> = [
  ["MemoryProgressStore", () => new MemoryProgressStore()],
  ["IdbProgressStore", () => new IdbProgressStore()],
];

describe.each(factories)("%s (ProgressStore contract)", (_name, create) => {
  let store: ProgressStore;

  beforeEach(async () => {
    store = create();
    // Fresh cycle AND fresh counts: wipe by resetting then overwriting rows
    // via recordSeen is not enough, so tests operate on distinct ids per
    // case where counts matter; the idb store shares one database across
    // instances, so reset the cycle to a known state.
    await store.resetCycle();
  });

  it("starts with no progress for unseen ids", async () => {
    const rows = await store.getProgress();
    expect(rows.filter((row) => row.questionId.startsWith("unseen-"))).toEqual([]);
  });

  it("records seen counts and increments on repeat plays", async () => {
    const id = `count-${Date.now()}-${Math.random()}`;
    await store.recordSeen([id], { completeInCycle: false });
    await store.recordSeen([id], { completeInCycle: false });

    const row = (await store.getProgress()).find((entry) => entry.questionId === id);
    expect(row?.seenCount).toBe(2);
    expect(row?.completedInCycle).toBe(false);
  });

  it("marks cycle completion without losing it on later non-sequential plays", async () => {
    const id = `cycle-${Date.now()}-${Math.random()}`;
    await store.recordSeen([id], { completeInCycle: true });
    await store.recordSeen([id], { completeInCycle: false });

    const row = (await store.getProgress()).find((entry) => entry.questionId === id);
    expect(row?.seenCount).toBe(2);
    expect(row?.completedInCycle).toBe(true);
  });

  it("resetCycle clears completion flags but keeps seen counts", async () => {
    const id = `reset-${Date.now()}-${Math.random()}`;
    await store.recordSeen([id], { completeInCycle: true });

    await store.resetCycle();

    const row = (await store.getProgress()).find((entry) => entry.questionId === id);
    expect(row?.seenCount).toBe(1);
    expect(row?.completedInCycle).toBe(false);
  });
});
