import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { QuizQuestion } from "@shared/schema";
import type { AnswerRecord, QuizPhase } from "@/core/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { HintsSection } from "@/app/components/hints-section";

interface QuestionCardProps {
  question: QuizQuestion;
  phase: QuizPhase;
  hintsRevealed: number;
  lastAnswer: AnswerRecord | undefined;
  isLastQuestion: boolean;
  onRevealHint: () => void;
  onAnswer: (chosenIndex: number) => void;
  onAdvance: () => void;
}

/**
 * One question: heading, radio options, hints, and (once answered) feedback.
 * Rendered with `key={question.id}` by the caller so mounting this component
 * fresh for each question both resets local selection state and moves focus
 * to the new question's heading via the mount-only effect below.
 */
export function QuestionCard({
  question,
  phase,
  hintsRevealed,
  lastAnswer,
  isLastQuestion,
  onRevealHint,
  onAnswer,
  onAdvance,
}: QuestionCardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const isAnswering = phase === "question";
  const chosenIndex = isAnswering
    ? selectedOption
    : lastAnswer
      ? String(lastAnswer.chosenIndex)
      : null;

  return (
    <Card className="quiz-question-card">
      <CardHeader>
        <h2 ref={headingRef} tabIndex={-1} id={headingId} className="quiz-question-card__heading">
          {question.question}
        </h2>
      </CardHeader>
      <CardContent className="quiz-question-card__content">
        <RadioGroup
          aria-labelledby={headingId}
          value={chosenIndex}
          onChange={setSelectedOption}
          isDisabled={!isAnswering}
        >
          {question.options.map((option, index) => (
            <RadioGroupItem key={option} value={String(index)}>
              {option}
            </RadioGroupItem>
          ))}
        </RadioGroup>

        <HintsSection
          question={question}
          hintsRevealed={hintsRevealed}
          onReveal={onRevealHint}
          disabled={!isAnswering}
        />

        {phase === "question" ? (
          <Button
            onPress={() => {
              if (selectedOption !== null) onAnswer(Number(selectedOption));
            }}
            isDisabled={selectedOption === null}
          >
            Check answer
          </Button>
        ) : null}

        {/*
          Stays mounted across phases (rather than only when phase is
          "feedback") so screen readers reliably announce the update —
          some only pick up content changes inside an already-mounted
          live region, not one that appears alongside its content.
        */}
        <div aria-live="polite" className="quiz-feedback">
          {phase === "feedback" && lastAnswer ? (
            <>
              <p
                className={
                  lastAnswer.correct
                    ? "quiz-feedback__status quiz-feedback__status--correct"
                    : "quiz-feedback__status quiz-feedback__status--incorrect"
                }
              >
                {lastAnswer.correct ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <XCircle aria-hidden="true" />
                )}
                {lastAnswer.correct ? "Correct" : "Incorrect"}
              </p>
              <p className="quiz-feedback__explanation">{question.explanation}</p>
              <a
                className="quiz-feedback__link"
                href={question.mdnUrl}
                target="_blank"
                rel="noopener"
              >
                Read on MDN
                <ExternalLink aria-hidden="true" />
                <span className="visually-hidden"> (opens in new tab)</span>
              </a>
              <Button onPress={onAdvance}>
                {isLastQuestion ? "See results" : "Next question"}
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
