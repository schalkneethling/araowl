import { useEffect, useId, useState } from "react";
import type { QuizAttempt } from "@shared/schema";
import type { ScoreStore } from "@/core/storage/score-store";
import { formatAttemptDate, topicSummary } from "@/app/format";

type ScoreHistoryProps = {
  store: ScoreStore;
  /** Bumped by the app whenever a new attempt is saved, to trigger a refetch. */
  refreshKey: number;
};

/** Past attempts pulled from the ScoreStore, refreshed whenever `refreshKey` changes. */
export function ScoreHistory({ store, refreshKey }: ScoreHistoryProps) {
  const headingId = useId();
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void store.listAttempts().then(
      (result) => {
        if (!cancelled) {
          setAttempts(result);
        }
      },
      (error: unknown) => {
        console.error("Failed to load quiz history", error);
        if (!cancelled) {
          setAttempts([]);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [store, refreshKey]);

  return (
    <aside aria-labelledby={headingId} className="quiz-history">
      <h2 id={headingId} className="quiz-history__heading">
        Past attempts
      </h2>
      {attempts === null ? null : attempts.length === 0 ? (
        <p className="quiz-history__empty">
          You haven't completed a quiz yet. Finish one to see your history here.
        </p>
      ) : (
        <ul className="quiz-history__list">
          {attempts.map((attempt) => (
            <li key={attempt.id} className="quiz-history__item">
              <span className="quiz-history__date">{formatAttemptDate(attempt.finishedAt)}</span>
              <span className="quiz-history__score">
                {attempt.score.correct} / {attempt.score.total}
              </span>
              <span className="quiz-history__topics">{topicSummary(attempt)}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
