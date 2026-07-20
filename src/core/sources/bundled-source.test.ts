import { describe, expect, it } from "vite-plus/test";
import { makeQuizIndex, threeQuestions } from "@shared/__fixtures__/quiz-fixtures";
import { BundledQuizSource } from "@/core/sources/bundled-source";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const ok = init.ok ?? true;
  return {
    ok,
    status: init.status ?? (ok ? 200 : 500),
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("BundledQuizSource", () => {
  it("fetches and parses a valid quiz index", async () => {
    const index = makeQuizIndex(threeQuestions);
    const fetchFn = (() => Promise.resolve(jsonResponse(index))) as unknown as typeof fetch;
    const source = new BundledQuizSource(fetchFn);
    const result = await source.getQuiz();
    expect(result.questions).toHaveLength(3);
  });

  it("uses the default url and honors a custom one", async () => {
    const urls: string[] = [];
    const fetchFn = ((url: string) => {
      urls.push(url);
      return Promise.resolve(jsonResponse(makeQuizIndex()));
    }) as unknown as typeof fetch;

    await new BundledQuizSource(fetchFn).getQuiz();
    await new BundledQuizSource(fetchFn, "/custom.json").getQuiz();
    expect(urls).toEqual(["/data/quiz-index.json", "/custom.json"]);
  });

  it("throws on an HTTP error", async () => {
    const fetchFn = (() =>
      Promise.resolve(jsonResponse(null, { ok: false, status: 404 }))) as unknown as typeof fetch;
    await expect(new BundledQuizSource(fetchFn).getQuiz()).rejects.toThrow(/404/);
  });

  it("throws on invalid JSON", async () => {
    const fetchFn = (() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.reject(new SyntaxError("bad json")),
      } as unknown as Response)) as unknown as typeof fetch;
    await expect(new BundledQuizSource(fetchFn).getQuiz()).rejects.toThrow(/valid JSON/);
  });

  it("throws when the payload fails schema validation", async () => {
    const fetchFn = (() =>
      Promise.resolve(jsonResponse({ version: 1, questions: [] }))) as unknown as typeof fetch;
    await expect(new BundledQuizSource(fetchFn).getQuiz()).rejects.toThrow(/schema/);
  });
});
