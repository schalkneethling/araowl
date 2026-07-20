import { useEffect, useRef } from "react";
import { TOPIC_LABELS, TOPICS } from "@shared/topics";
import { getAnonUserId } from "@/core/anon-user";
import type { QuizState } from "@/core/engine";
import { buildAttempt, computeScore } from "@/core/scoring";
import type { ScoreStore } from "@/core/storage/score-store";
import { Button } from "@/components/ui/button";

interface ResultsViewProps {
  quiz: QuizState;
  store: ScoreStore;
  onSaved: () => void;
  onRestart: () => void;
}

/**
 * Final screen: overall + per-topic score and hints used. Persists the
 * attempt exactly once per completed quiz via a mount-scoped ref guard —
 * this component is freshly mounted whenever the app transitions into the
 * "results" view, and the ref survives React StrictMode's double-invoked
 * effect within that single mount.
 */
export function ResultsView({ quiz, store, onSaved, onRestart }: ResultsViewProps) {
  const hasSavedRef = useRef(false);
  const score = computeScore(quiz.questions, quiz.answers);
  const hintsUsedTotal = quiz.answers.reduce((total, answer) => total + answer.hintsUsed, 0);
  const topicsWithScores = TOPICS.filter((topic) => score.byTopic[topic]);

  useEffect(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;

    const anonUserId = getAnonUserId(localStorage);
    const attempt = buildAttempt(quiz, { anonUserId, finishedAt: new Date().toISOString() });
    void store
      .saveAttempt(attempt)
      .then(onSaved)
      .catch((error: unknown) => {
        console.error("Failed to persist quiz attempt", error);
      });
  }, [quiz, store, onSaved]);

  return (
    <section aria-labelledby="quiz-results-heading" className="quiz-results">
      <h2 id="quiz-results-heading" className="quiz-results__heading">
        Your results
      </h2>
      <p className="quiz-results__score">
        {score.correct} / {score.total}
      </p>
      <table className="quiz-results__table">
        <caption>Score by topic</caption>
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col">Correct</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {topicsWithScores.map((topic) => {
            const topicScore = score.byTopic[topic];
            return topicScore ? (
              <tr key={topic}>
                <th scope="row">{TOPIC_LABELS[topic]}</th>
                <td>{topicScore.correct}</td>
                <td>{topicScore.total}</td>
              </tr>
            ) : null;
          })}
        </tbody>
      </table>
      <p className="quiz-results__hints">Hints used: {hintsUsedTotal}</p>
      <Button onPress={onRestart}>Try again</Button>
    </section>
  );
}
