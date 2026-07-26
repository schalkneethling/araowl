import { MIN_QUIZ_SIZE, QUIZ_SIZE_STEP, type QuizMode } from "@/core/selection";

export type QuizSettings = {
  size: number;
  mode: QuizMode;
};

export const QUIZ_SETTINGS_STORAGE_KEY = "araowl:quiz-settings:v1";

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = { size: 10, mode: "sequential" };

function isQuizMode(value: unknown): value is QuizMode {
  return value === "sequential" || value === "random";
}

function isValidSize(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_QUIZ_SIZE &&
    value % QUIZ_SIZE_STEP === 0
  );
}

function getBrowserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Read stored settings; anything malformed falls back to the defaults. */
export function readQuizSettings(storage: Storage | null = getBrowserStorage()): QuizSettings {
  if (!storage) {
    return DEFAULT_QUIZ_SETTINGS;
  }
  try {
    const raw = storage.getItem(QUIZ_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_QUIZ_SETTINGS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_QUIZ_SETTINGS;
    }
    const candidate = parsed as Record<string, unknown>;
    if (!isValidSize(candidate["size"]) || !isQuizMode(candidate["mode"])) {
      return DEFAULT_QUIZ_SETTINGS;
    }
    return { size: candidate["size"], mode: candidate["mode"] };
  } catch {
    return DEFAULT_QUIZ_SETTINGS;
  }
}

export function writeQuizSettings(
  settings: QuizSettings,
  storage: Storage | null = getBrowserStorage(),
): void {
  try {
    storage?.setItem(QUIZ_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable: settings simply won't persist this session.
  }
}
