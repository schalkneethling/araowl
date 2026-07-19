import type { StartPhaseState } from "@/app/quiz-reducer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface StartViewProps {
  state: StartPhaseState;
  onStart: () => void;
}

/** Intro card for the quiz island: pitch, start button, and loading/error variants. */
export function StartView({ state, onStart }: StartViewProps) {
  const isLoading = state.view === "loading";
  const isError = state.view === "error";

  return (
    <Card className="quiz-start-card">
      <CardHeader>
        <h2 className="quiz-start-card__heading typo-md">Practice quiz</h2>
      </CardHeader>
      <CardContent className="quiz-start-card__content">
        <p>
          10 questions pulled straight from MDN Web Docs, covering HTML, CSS, JavaScript, Web APIs,
          and accessibility. Once loaded, the quiz works fully offline.
        </p>
        {isError ? (
          <p className="quiz-start-card__error" role="alert">
            {state.message}
          </p>
        ) : null}
        <Button onPress={onStart} isDisabled={isLoading}>
          {isLoading ? "Loading quiz…" : isError ? "Retry" : "Start quiz"}
        </Button>
      </CardContent>
    </Card>
  );
}
