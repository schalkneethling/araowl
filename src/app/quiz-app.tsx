import { useCallback, useEffect, useReducer, useState } from "react";
import type { QuizQuestion } from "@shared/schema";
import { trackEvent } from "@/core/analytics";
import { readQuizSettings, writeQuizSettings, type QuizSettings } from "@/core/quiz-settings";
import { computeScore } from "@/core/scoring";
import { isCycleExhausted, selectQuestions } from "@/core/selection";
import { BundledQuizSource } from "@/core/sources/bundled-source";
import { IdbProgressStore } from "@/core/storage/idb-progress-store";
import { IdbScoreStore } from "@/core/storage/idb-score-store";
import { QuizRunner } from "@/app/components/quiz-runner";
import { ResultsView } from "@/app/components/results-view";
import { ScoreHistory } from "@/app/components/score-history";
import { StartView } from "@/app/components/start-view";
import { appReducer, initialAppState } from "@/app/quiz-reducer";

// Created once per app load, not per render: the source has no per-instance
// state worth resetting, and both stores lazily open their IndexedDB
// connections only when first used.
const quizSource = new BundledQuizSource(fetch.bind(globalThis));
const scoreStore = new IdbScoreStore();
const progressStore = new IdbProgressStore();

/** Root quiz island: start screen, one-question-at-a-time runner, and results. */
export function QuizApp() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [settings, setSettings] = useState<QuizSettings>(() => readQuizSettings());
  const [pool, setPool] = useState<QuizQuestion[] | null>(null);
  const [completedCount, setCompletedCount] = useState<number | null>(null);

  // Eagerly learn the pool size (slider bounds) and cycle progress (start
  // card copy). Failures stay silent here — starting a quiz has its own
  // error path, and the slider simply falls back to its minimum.
  useEffect(() => {
    let cancelled = false;
    void quizSource
      .getQuiz()
      .then((index) => {
        if (!cancelled) {
          setPool(index.questions);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (pool === null) {
      return;
    }
    let cancelled = false;
    const poolIds = new Set(pool.map((question) => question.id));
    void progressStore
      .getProgress()
      .then((rows) => {
        if (!cancelled) {
          setCompletedCount(
            rows.filter((row) => row.completedInCycle && poolIds.has(row.questionId)).length,
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pool, historyVersion]);

  const updateSettings = useCallback((next: QuizSettings) => {
    setSettings(next);
    writeQuizSettings(next);
  }, []);

  const handleStart = useCallback(() => {
    dispatch({ type: "START_REQUESTED" });
    void (async () => {
      const index = await quizSource.getQuiz();
      setPool(index.questions);
      // Progress is an enhancement, never a gate: if the store is broken
      // (e.g. a damaged IndexedDB), the quiz still starts — selection just
      // behaves as a fresh profile.
      let progress = await progressStore.getProgress().catch((error: unknown) => {
        console.error("Failed to read question progress", error);
        return [];
      });
      // An exhausted sequential set starts a fresh cycle at the next quiz.
      if (settings.mode === "sequential" && isCycleExhausted(index.questions, progress)) {
        await progressStore.resetCycle();
        progress = await progressStore.getProgress();
        setHistoryVersion((version) => version + 1);
      }
      const questions = selectQuestions(index.questions, {
        size: settings.size,
        mode: settings.mode,
        progress,
        rng: Math.random,
      });
      dispatch({ type: "START_LOADED", questions, source: index.source });
      // No-op unless the user consented to analytics (see core/analytics).
      trackEvent("quiz-started", { source: index.source });
    })().catch((error: unknown) => {
      dispatch({
        type: "START_FAILED",
        message: error instanceof Error ? error.message : "Failed to load the quiz.",
      });
    });
  }, [settings]);

  const handleSaved = useCallback(() => {
    setHistoryVersion((version) => version + 1);
  }, []);

  // Completion is a reducer transition (ADVANCE on the last question), so the
  // side effects live here. State is stable while the results view is shown,
  // so this fires once per completion. Aggregate numbers only — never PII.
  useEffect(() => {
    if (state.view !== "results") {
      return;
    }
    const score = computeScore(state.quiz.questions, state.quiz.answers);
    trackEvent("quiz-completed", { score: score.correct, total: score.total });
    // Selection bookkeeping: every played question was seen; sequential
    // rounds also count toward the current cycle.
    void progressStore
      .recordSeen(
        state.quiz.questions.map((question) => question.id),
        { completeInCycle: settings.mode === "sequential" },
      )
      .then(() => {
        setHistoryVersion((version) => version + 1);
      })
      .catch((error: unknown) => {
        console.error("Failed to record question progress", error);
      });
    // settings.mode is read at completion time; it can only change on the
    // start view, so it still describes the round that just finished.
  }, [state]);

  return (
    <div className="quiz-app">
      {state.view === "start" || state.view === "loading" || state.view === "error" ? (
        <>
          <StartView
            state={state}
            settings={settings}
            onSettingsChange={updateSettings}
            poolSize={pool?.length ?? null}
            completedCount={completedCount}
            onStart={handleStart}
          />
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
