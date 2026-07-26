import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  isAnalyticsConsent,
  loadUmamiAnalytics,
  readAnalyticsConsent,
  trackEvent,
  UMAMI_SCRIPT_ID,
  writeAnalyticsConsent,
} from "./analytics";

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

function makeThrowingStorage(): Storage {
  const throwing = () => {
    throw new Error("storage disabled");
  };
  return {
    length: 0,
    clear: throwing,
    getItem: throwing,
    key: () => null,
    removeItem: throwing,
    setItem: throwing,
  };
}

type FakeScript = {
  defer: boolean;
  id: string;
  src: string;
  dataset: Record<string, string>;
};

function makeFakeDocument() {
  const appended: FakeScript[] = [];
  const byId = new Map<string, FakeScript>();
  const documentRef = {
    createElement: () => ({ defer: false, id: "", src: "", dataset: {} }) as FakeScript,
    getElementById: (id: string) => byId.get(id) ?? null,
    head: {
      appendChild: (script: FakeScript) => {
        appended.push(script);
        byId.set(script.id, script);
        return script;
      },
    },
  } as unknown as Document;
  return { appended, documentRef };
}

describe("analytics consent", () => {
  it("recognizes only granted/denied as consent values", () => {
    expect(isAnalyticsConsent("granted")).toBe(true);
    expect(isAnalyticsConsent("denied")).toBe(true);
    expect(isAnalyticsConsent("maybe")).toBe(false);
    expect(isAnalyticsConsent(null)).toBe(false);
  });

  it("round-trips consent through storage", () => {
    const storage = makeMemoryStorage();
    expect(readAnalyticsConsent(storage)).toBeNull();

    expect(writeAnalyticsConsent("granted", storage)).toBe(true);
    expect(readAnalyticsConsent(storage)).toBe("granted");
    expect(storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe("granted");

    expect(writeAnalyticsConsent("denied", storage)).toBe(true);
    expect(readAnalyticsConsent(storage)).toBe("denied");
  });

  it("treats corrupted stored values as no consent", () => {
    const storage = makeMemoryStorage();
    storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "garbage");
    expect(readAnalyticsConsent(storage)).toBeNull();
  });

  it("tolerates unavailable or throwing storage", () => {
    expect(readAnalyticsConsent(null)).toBeNull();
    expect(writeAnalyticsConsent("granted", null)).toBe(false);
    expect(readAnalyticsConsent(makeThrowingStorage())).toBeNull();
    expect(writeAnalyticsConsent("denied", makeThrowingStorage())).toBe(false);
  });
});

describe("loadUmamiAnalytics", () => {
  it("injects the deferred script once, with the website id attached", () => {
    const { appended, documentRef } = makeFakeDocument();

    loadUmamiAnalytics(documentRef);
    loadUmamiAnalytics(documentRef);

    expect(appended).toHaveLength(1);
    const script = appended[0];
    expect(script?.defer).toBe(true);
    expect(script?.id).toBe(UMAMI_SCRIPT_ID);
    expect(script?.src).toContain("analytics");
    expect(script?.dataset["websiteId"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("trackEvent", () => {
  afterEach(() => {
    delete (globalThis as { umami?: unknown }).umami;
  });

  it("is a no-op when the Umami script is not loaded", () => {
    expect(() => trackEvent("quiz-started")).not.toThrow();
  });

  it("forwards name and data to window.umami.track when present", () => {
    const track = vi.fn();
    (globalThis as { umami?: unknown }).umami = { track };

    trackEvent("quiz-completed", { score: 7, total: 10 });

    expect(track).toHaveBeenCalledWith("quiz-completed", { score: 7, total: 10 });
  });
});
