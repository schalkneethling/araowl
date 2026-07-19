import { describe, expect, it } from "vite-plus/test";

// Trivial smoke test to confirm `vp test` (Vitest) is wired up correctly.
// This will be replaced with real unit tests in Phase 1.
describe("smoke", () => {
  it("passes", () => {
    expect(1 + 1).toBe(2);
  });
});
