import { useEffect, useId, useRef, useState } from "react";
import type { QuizAttempt } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { formatAttemptDate, topicSummary } from "@/app/format";
import type { ScoreStore } from "@/core/storage/score-store";

type ScoreHistoryProps = {
  store: ScoreStore;
  /** Bumped by the app whenever a new attempt is saved, to trigger a refetch. */
  refreshKey: number;
};

/** Which destructive action is awaiting inline confirmation, if any. */
type PendingConfirm = { kind: "attempt"; id: string } | { kind: "all" } | null;

/** Where focus must land after the next commit (see the focus effect). */
type FocusTarget =
  | { kind: "delete-button"; id: string }
  | { kind: "clear-button" }
  | { kind: "heading" }
  | null;

/**
 * Past attempts pulled from the ScoreStore, refreshed whenever `refreshKey`
 * changes. Deleting is irreversible, so every destructive action goes
 * through an inline two-step confirm (no modal, no focus trap); focus is
 * explicitly managed so keyboard users are never dropped to the page body,
 * and outcomes are announced through a visually-hidden status region.
 */
export function ScoreHistory({ store, refreshKey }: ScoreHistoryProps) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusTargetRef = useRef<FocusTarget>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [pending, setPending] = useState<PendingConfirm>(null);
  const [status, setStatus] = useState("");

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

  // Focus moves only after React commits the new DOM: the button a
  // cancelled confirm restores (or the survivor after a delete) does not
  // exist until this render lands, so a synchronous .focus() would miss.
  useEffect(() => {
    const target = focusTargetRef.current;
    if (!target) {
      return;
    }
    focusTargetRef.current = null;
    if (target.kind === "heading") {
      headingRef.current?.focus();
      return;
    }
    if (target.kind === "clear-button") {
      clearButtonRef.current?.focus();
      return;
    }
    deleteButtonRefs.current.get(target.id)?.focus();
  }, [attempts, pending]);

  function deleteAttempt(id: string) {
    const current = attempts ?? [];
    const index = current.findIndex((a) => a.id === id);
    const remaining = current.filter((a) => a.id !== id);
    void store.deleteAttempt(id).then(
      () => {
        // The next row slides into the removed row's index; fall back to the
        // previous row, then the heading when the list empties.
        const neighbor = remaining[index] ?? remaining[index - 1];
        focusTargetRef.current = neighbor
          ? { kind: "delete-button", id: neighbor.id }
          : { kind: "heading" };
        deleteButtonRefs.current.delete(id);
        setAttempts(remaining);
        setPending(null);
        setStatus("Attempt deleted.");
      },
      (error: unknown) => {
        console.error("Failed to delete attempt", error);
        setPending(null);
        setStatus("Something went wrong. Your history was not changed.");
      },
    );
  }

  function clearHistory() {
    void store.clear().then(
      () => {
        focusTargetRef.current = { kind: "heading" };
        deleteButtonRefs.current.clear();
        setAttempts([]);
        setPending(null);
        setStatus("History cleared.");
      },
      (error: unknown) => {
        console.error("Failed to clear history", error);
        setPending(null);
        setStatus("Something went wrong. Your history was not changed.");
      },
    );
  }

  return (
    <aside aria-labelledby={headingId} className="quiz-history">
      {/* tabIndex -1: programmatic focus target when the list empties. */}
      <h2 className="quiz-history__heading" id={headingId} ref={headingRef} tabIndex={-1}>
        Past attempts
      </h2>
      {attempts === null ? null : attempts.length === 0 ? (
        <p className="quiz-history__empty">
          You haven't completed a quiz yet. Finish one to see your history here.
        </p>
      ) : (
        <>
          <ul className="quiz-history__list">
            {attempts.map((attempt) => {
              const isConfirming = pending?.kind === "attempt" && pending.id === attempt.id;
              const dateLabel = formatAttemptDate(attempt.finishedAt);
              return (
                <li key={attempt.id} className="quiz-history__item">
                  <span className="quiz-history__date">{dateLabel}</span>
                  <span className="quiz-history__score">
                    {attempt.score.correct} / {attempt.score.total}
                  </span>
                  <span className="quiz-history__topics">{topicSummary(attempt)}</span>
                  <span className="quiz-history__actions">
                    {isConfirming ? (
                      <>
                        <Button
                          autoFocus
                          onPress={() => deleteAttempt(attempt.id)}
                          size="sm"
                          variant="destructive"
                        >
                          Confirm
                          <span className="visually-hidden">
                            {" "}
                            deletion of the attempt from {dateLabel}
                          </span>
                        </Button>
                        <Button
                          onPress={() => {
                            focusTargetRef.current = { kind: "delete-button", id: attempt.id };
                            setPending(null);
                          }}
                          size="sm"
                          variant="secondary"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        onPress={() => setPending({ kind: "attempt", id: attempt.id })}
                        ref={(element: HTMLButtonElement | null) => {
                          if (element) {
                            deleteButtonRefs.current.set(attempt.id, element);
                          } else {
                            deleteButtonRefs.current.delete(attempt.id);
                          }
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Delete
                        <span className="visually-hidden"> attempt from {dateLabel}</span>
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="quiz-history__clear">
            {pending?.kind === "all" ? (
              <>
                <Button autoFocus onPress={clearHistory} size="sm" variant="destructive">
                  Confirm
                  <span className="visually-hidden"> deletion of all attempts</span>
                </Button>
                <Button
                  onPress={() => {
                    focusTargetRef.current = { kind: "clear-button" };
                    setPending(null);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onPress={() => setPending({ kind: "all" })}
                ref={clearButtonRef}
                size="sm"
                variant="outline"
              >
                Clear history
              </Button>
            )}
          </div>
        </>
      )}
      <p className="visually-hidden" role="status">
        {status}
      </p>
    </aside>
  );
}
