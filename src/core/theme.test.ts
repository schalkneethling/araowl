import { describe, expect, it, vi } from "vite-plus/test";
import { applyTheme, getStoredThemePreference, setStoredThemePreference } from "@/core/theme";

function makeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

function makeTarget() {
  return {
    setAttribute: vi.fn<(name: string, value: string) => void>(),
    removeAttribute: vi.fn<(name: string) => void>(),
  };
}

describe("getStoredThemePreference", () => {
  it("defaults to system when nothing is stored", () => {
    expect(getStoredThemePreference(makeStorage())).toBe("system");
  });

  it("returns a validly stored preference", () => {
    expect(getStoredThemePreference(makeStorage({ "araowl:theme-preference": "light" }))).toBe(
      "light",
    );
    expect(getStoredThemePreference(makeStorage({ "araowl:theme-preference": "dark" }))).toBe(
      "dark",
    );
  });

  it("falls back to system for an unrecognized stored value", () => {
    expect(getStoredThemePreference(makeStorage({ "araowl:theme-preference": "blue" }))).toBe(
      "system",
    );
  });
});

describe("setStoredThemePreference", () => {
  it("persists the preference under the expected key", () => {
    const storage = makeStorage();
    setStoredThemePreference(storage, "dark");
    expect(getStoredThemePreference(storage)).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("sets data-theme to light", () => {
    const target = makeTarget();
    applyTheme("light", target);
    expect(target.setAttribute).toHaveBeenCalledWith("data-theme", "light");
    expect(target.removeAttribute).not.toHaveBeenCalled();
  });

  it("sets data-theme to dark", () => {
    const target = makeTarget();
    applyTheme("dark", target);
    expect(target.setAttribute).toHaveBeenCalledWith("data-theme", "dark");
    expect(target.removeAttribute).not.toHaveBeenCalled();
  });

  it("removes data-theme for system, letting CSS follow the OS preference", () => {
    const target = makeTarget();
    applyTheme("system", target);
    expect(target.removeAttribute).toHaveBeenCalledWith("data-theme");
    expect(target.setAttribute).not.toHaveBeenCalled();
  });
});
