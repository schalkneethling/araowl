import type { QuizQuestion } from "@shared/schema";
import {
  advance,
  answerQuestion,
  createQuizState,
  isComplete,
  revealHint,
  type QuizSourceKind,
  type QuizState,
} from "@/core/engine";

/**
 * App-level view state. Wraps the pure `QuizState` from the engine with the
 * phases that only make sense at the UI layer (loading a quiz, a failed
 * fetch, and the post-quiz results screen).
 */
export type AppState =
  | { view: "start" }
  | { view: "loading" }
  | { view: "error"; message: string }
  | { view: "active"; quiz: QuizState }
  | { view: "results"; quiz: QuizState };

/** The subset of `AppState` rendered by the start screen (intro or its loading/error variants). */
export type StartPhaseState = Extract<AppState, { view: "start" | "loading" | "error" }>;

export type AppAction =
  | { type: "START_REQUESTED" }
  | { type: "START_LOADED"; questions: QuizQuestion[]; source: QuizSourceKind }
  | { type: "START_FAILED"; message: string }
  | { type: "REVEAL_HINT" }
  | { type: "ANSWER"; chosenIndex: number }
  | { type: "ADVANCE" }
  | { type: "RESTART" };

export const initialAppState: AppState = { view: "start" };

/**
 * Reducer wrapping the pure engine transitions. Illegal actions for the
 * current view (e.g. ANSWER while not "active") are no-ops here; the engine
 * itself throws if an action is legal for the view but illegal for the
 * current quiz phase (e.g. answering twice), so callers must gate dispatch
 * on `quiz.phase` as described in engine.ts.
 */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_REQUESTED":
      return { view: "loading" };

    case "START_LOADED":
      return {
        view: "active",
        quiz: createQuizState(action.questions, { source: action.source }),
      };

    case "START_FAILED":
      return { view: "error", message: action.message };

    case "REVEAL_HINT":
      if (state.view !== "active") return state;
      return { view: "active", quiz: revealHint(state.quiz) };

    case "ANSWER":
      if (state.view !== "active") return state;
      return { view: "active", quiz: answerQuestion(state.quiz, action.chosenIndex) };

    case "ADVANCE": {
      if (state.view !== "active") return state;
      const next = advance(state.quiz);
      return isComplete(next) ? { view: "results", quiz: next } : { view: "active", quiz: next };
    }

    case "RESTART":
      return { view: "start" };

    default:
      return state;
  }
}
