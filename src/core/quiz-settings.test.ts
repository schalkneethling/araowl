import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_QUIZ_SETTINGS,
  QUIZ_SETTINGS_STORAGE_KEY,
  readQuizSettings,
  writeQuizSettings,
} from "./quiz-settings";

function makeMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("quiz settings", () => {
  it("round-trips through storage", () => {
    const storage = makeMemoryStorage();
    writeQuizSettings({ size: 30, mode: "random" }, storage);
    expect(readQuizSettings(storage)).toEqual({ size: 30, mode: "random" });
  });

  it("falls back to defaults when storage is empty or absent", () => {
    expect(readQuizSettings(makeMemoryStorage())).toEqual(DEFAULT_QUIZ_SETTINGS);
    expect(readQuizSettings(null)).toEqual(DEFAULT_QUIZ_SETTINGS);
  });

  it.each([
    ["not JSON", "garbage"],
    ["wrong shape", JSON.stringify(["nope"])],
    ["invalid mode", JSON.stringify({ size: 10, mode: "chaotic" })],
    ["size below minimum", JSON.stringify({ size: 5, mode: "sequential" })],
    ["size off the step grid", JSON.stringify({ size: 25, mode: "sequential" })],
    ["non-integer size", JSON.stringify({ size: 10.5, mode: "sequential" })],
  ])("falls back to defaults for %s", (_label, raw) => {
    const storage = makeMemoryStorage();
    storage.setItem(QUIZ_SETTINGS_STORAGE_KEY, raw);
    expect(readQuizSettings(storage)).toEqual(DEFAULT_QUIZ_SETTINGS);
  });
});
