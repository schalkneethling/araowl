import type { QuizQuestion } from "@shared/schema";

/** Absolute upper bound on hints per question, regardless of how many exist. */
export const MAX_HINTS = 3;

export type QuizPhase = "question" | "feedback" | "complete";

export type QuizSourceKind = "bundled" | "ai";

/** One recorded answer; shape matches a QuizAttempt answer for direct reuse. */
export interface AnswerRecord {
  questionId: string;
  chosenIndex: number;
  correct: boolean;
  hintsUsed: number;
}

/**
 * Fully serializable quiz state, designed for both React `useReducer` and CLI
 * use. Every field is a plain JSON value so the whole object round-trips
 * through `JSON.stringify`/`structuredClone`.
 */
export interface QuizState {
  questions: QuizQuestion[];
  source: QuizSourceKind;
  currentIndex: number;
  phase: QuizPhase;
  /** Hints revealed for the current question only; reset on `advance`. */
  hintsRevealed: number;
  answers: AnswerRecord[];
  startedAt: string;
}

/**
 * Invalid-transition policy: every transition throws an `Error` when called in
 * a phase where it does not apply, or with out-of-range arguments. This keeps
 * bugs loud in both the reducer and the CLI rather than silently no-opping.
 */

/** Build the initial state for a quiz. Throws if `questions` is empty. */
export function createQuizState(
  questions: QuizQuestion[],
  opts: { source: QuizSourceKind },
): QuizState {
  if (questions.length === 0) {
    throw new Error("createQuizState: cannot start a quiz with no questions");
  }
  return {
    questions,
    source: opts.source,
    currentIndex: 0,
    phase: "question",
    hintsRevealed: 0,
    answers: [],
    startedAt: new Date().toISOString(),
  };
}

function hintsAvailable(state: QuizState): number {
  return Math.min(currentQuestion(state).hints.length, MAX_HINTS);
}

/** Reveal one more hint for the current question. */
export function revealHint(state: QuizState): QuizState {
  if (state.phase !== "question") {
    throw new Error(
      `revealHint: can only reveal hints in the "question" phase (was "${state.phase}")`,
    );
  }
  if (state.hintsRevealed >= hintsAvailable(state)) {
    throw new Error("revealHint: no more hints available for this question");
  }
  return { ...state, hintsRevealed: state.hintsRevealed + 1 };
}

/** Answer the current question, recording correctness and hints used. */
export function answerQuestion(state: QuizState, chosenIndex: number): QuizState {
  if (state.phase !== "question") {
    throw new Error(
      `answerQuestion: can only answer in the "question" phase (was "${state.phase}")`,
    );
  }
  const question = currentQuestion(state);
  if (!Number.isInteger(chosenIndex) || chosenIndex < 0 || chosenIndex >= question.options.length) {
    throw new Error(`answerQuestion: chosenIndex ${chosenIndex} is out of range`);
  }
  const record: AnswerRecord = {
    questionId: question.id,
    chosenIndex,
    correct: chosenIndex === question.answerIndex,
    hintsUsed: state.hintsRevealed,
  };
  return { ...state, phase: "feedback", answers: [...state.answers, record] };
}

/** Advance from feedback to the next question, or complete the quiz. */
export function advance(state: QuizState): QuizState {
  if (state.phase !== "feedback") {
    throw new Error(`advance: can only advance from the "feedback" phase (was "${state.phase}")`);
  }
  const isLast = state.currentIndex >= state.questions.length - 1;
  if (isLast) {
    return { ...state, phase: "complete" };
  }
  return {
    ...state,
    currentIndex: state.currentIndex + 1,
    phase: "question",
    hintsRevealed: 0,
  };
}

/** The question currently in focus. */
export function currentQuestion(state: QuizState): QuizQuestion {
  const question = state.questions[state.currentIndex];
  if (!question) {
    throw new Error(`currentQuestion: no question at index ${state.currentIndex}`);
  }
  return question;
}

/** 1-based progress for display, e.g. `{ current: 2, total: 3 }`. */
export function progress(state: QuizState): { current: number; total: number } {
  return { current: state.currentIndex + 1, total: state.questions.length };
}

/** Whether the quiz has reached the complete phase. */
export function isComplete(state: QuizState): boolean {
  return state.phase === "complete";
}
