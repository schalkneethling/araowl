import { parseQuizIndex, type QuizIndex } from "@shared/schema";
import type { QuizSource } from "@/core/sources/quiz-source";

const DEFAULT_URL = "/data/quiz-index.json";

/** Loads the quiz index bundled with the app from a static JSON file. */
export class BundledQuizSource implements QuizSource {
  private readonly fetchFn: typeof fetch;
  private readonly url: string;

  constructor(fetchFn: typeof fetch, url: string = DEFAULT_URL) {
    this.fetchFn = fetchFn;
    this.url = url;
  }

  async getQuiz(): Promise<QuizIndex> {
    const response = await this.fetchFn(this.url);
    if (!response.ok) {
      throw new Error(
        `BundledQuizSource: failed to fetch ${this.url} (${response.status} ${response.statusText})`,
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (cause) {
      throw new Error(`BundledQuizSource: ${this.url} did not contain valid JSON`, { cause });
    }

    try {
      return parseQuizIndex(data);
    } catch (cause) {
      throw new Error(`BundledQuizSource: ${this.url} did not match the quiz schema`, { cause });
    }
  }
}
