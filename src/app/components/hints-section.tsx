import { Lightbulb } from "lucide-react";
import type { QuizQuestion } from "@shared/schema";
import { MAX_HINTS } from "@/core/engine";
import { Button } from "@/components/ui/button";

type HintsSectionProps = {
  question: QuizQuestion;
  hintsRevealed: number;
  onReveal: () => void;
  disabled: boolean;
};

/**
 * Progressive hint reveal: already-revealed hints stay visible; the button
 * disappears once every available hint (capped at MAX_HINTS) has been shown.
 * The list is a live region so each newly revealed hint is announced;
 * aria-relevant="additions" keeps that announcement scoped to the new hint
 * rather than re-reading the whole growing list.
 */
export function HintsSection({ question, hintsRevealed, onReveal, disabled }: HintsSectionProps) {
  const hintsAvailable = Math.min(question.hints.length, MAX_HINTS);
  const nextHintNumber = hintsRevealed + 1;

  return (
    <div className="quiz-hints">
      {hintsRevealed > 0 ? (
        <ul className="quiz-hints__list" aria-live="polite" aria-relevant="additions">
          {question.hints.slice(0, hintsRevealed).map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      ) : null}
      {hintsRevealed < hintsAvailable ? (
        <Button variant="outline" size="sm" onPress={onReveal} isDisabled={disabled}>
          <Lightbulb aria-hidden="true" />
          {`Reveal hint ${nextHintNumber}/${hintsAvailable}`}
        </Button>
      ) : null}
    </div>
  );
}
