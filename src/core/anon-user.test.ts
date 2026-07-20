import { describe, expect, it } from "vite-plus/test";
import { ANON_USER_ID_KEY, getAnonUserId } from "@/core/anon-user";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    map,
  };
}

describe("getAnonUserId", () => {
  it("creates and persists an id on first use", () => {
    const storage = fakeStorage();
    const id = getAnonUserId(storage);
    expect(id).toBeTruthy();
    expect(storage.map.get(ANON_USER_ID_KEY)).toBe(id);
  });

  it("returns the same id across calls", () => {
    const storage = fakeStorage();
    const first = getAnonUserId(storage);
    const second = getAnonUserId(storage);
    expect(second).toBe(first);
  });

  it("returns an existing stored id", () => {
    const storage = fakeStorage({ [ANON_USER_ID_KEY]: "preexisting-id" });
    expect(getAnonUserId(storage)).toBe("preexisting-id");
  });
});
