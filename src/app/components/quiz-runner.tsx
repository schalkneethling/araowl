import { useId } from "react";
import { currentQuestion, progress, type QuizState } from "@/core/engine";
import { QuestionCard } from "@/app/components/question-card";

type QuizRunnerProps = {
  quiz: QuizState;
  onRevealHint: () => void;
  onAnswer: (chosenIndex: number) => void;
  onAdvance: () => void;
};

/** Drives one question at a time: progress indicator plus the active question card. */
export function QuizRunner({ quiz, onRevealHint, onAnswer, onAdvance }: QuizRunnerProps) {
  const progressId = useId();
  const { current, total } = progress(quiz);
  const question = currentQuestion(quiz);
  const lastAnswer = quiz.answers[quiz.answers.length - 1];

  return (
    <div className="quiz-runner">
      <div className="quiz-progress">
        <label htmlFor={progressId} className="quiz-progress__label">
          Question {current} of {total}
        </label>
        <progress id={progressId} className="quiz-progress__bar" value={current} max={total}>
          {`${current} of ${total}`}
        </progress>
      </div>
      <QuestionCard
        key={question.id}
        question={question}
        phase={quiz.phase}
        hintsRevealed={quiz.hintsRevealed}
        lastAnswer={lastAnswer}
        isLastQuestion={current === total}
        onRevealHint={onRevealHint}
        onAnswer={onAnswer}
        onAdvance={onAdvance}
      />
    </div>
  );
}
