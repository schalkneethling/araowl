import { useCallback, useReducer, useState } from "react";
import { BundledQuizSource } from "@/core/sources/bundled-source";
import { IdbScoreStore } from "@/core/storage/idb-score-store";
import { QuizRunner } from "@/app/components/quiz-runner";
import { ResultsView } from "@/app/components/results-view";
import { ScoreHistory } from "@/app/components/score-history";
import { StartView } from "@/app/components/start-view";
import { appReducer, initialAppState } from "@/app/quiz-reducer";

// Created once per app load, not per render: the source has no per-instance
// state worth resetting, and the score store lazily opens its IndexedDB
// connection only when first used.
const quizSource = new BundledQuizSource(fetch.bind(globalThis));
const scoreStore = new IdbScoreStore();

/** Root quiz island: start screen, one-question-at-a-time runner, and results. */
export function QuizApp() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [historyVersion, setHistoryVersion] = useState(0);

  const handleStart = useCallback(() => {
    dispatch({ type: "START_REQUESTED" });
    quizSource
      .getQuiz()
      .then((index) => {
        dispatch({ type: "START_LOADED", questions: index.questions, source: index.source });
      })
      .catch((error: unknown) => {
        dispatch({
          type: "START_FAILED",
          message: error instanceof Error ? error.message : "Failed to load the quiz.",
        });
      });
  }, []);

  const handleSaved = useCallback(() => {
    setHistoryVersion((version) => version + 1);
  }, []);

  return (
    <div className="quiz-app">
      {state.view === "start" || state.view === "loading" || state.view === "error" ? (
        <>
          <StartView state={state} onStart={handleStart} />
          <ScoreHistory store={scoreStore} refreshKey={historyVersion} />
        </>
      ) : null}
      {state.view === "active" ? (
        <QuizRunner
          quiz={state.quiz}
          onRevealHint={() => dispatch({ type: "REVEAL_HINT" })}
          onAnswer={(chosenIndex) => dispatch({ type: "ANSWER", chosenIndex })}
          onAdvance={() => dispatch({ type: "ADVANCE" })}
        />
      ) : null}
      {state.view === "results" ? (
        <ResultsView
          quiz={state.quiz}
          store={scoreStore}
          onSaved={handleSaved}
          onRestart={() => dispatch({ type: "RESTART" })}
        />
      ) : null}
    </div>
  );
}
