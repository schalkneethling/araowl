import { Label } from "react-aria-components";
import type { StartPhaseState } from "@/app/quiz-reducer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider, SliderOutput } from "@/components/ui/slider";
import { maxQuizSize, MIN_QUIZ_SIZE, QUIZ_SIZE_STEP, type QuizMode } from "@/core/selection";
import type { QuizSettings } from "@/core/quiz-settings";

type StartViewProps = {
  state: StartPhaseState;
  settings: QuizSettings;
  onSettingsChange: (settings: QuizSettings) => void;
  /** Total questions in the bundled pool; null while it loads. */
  poolSize: number | null;
  /** Pool questions completed this sequential cycle; null while loading. */
  completedCount: number | null;
  onStart: () => void;
};

/** Intro card for the quiz island: pitch, quiz configuration, start button. */
export function StartView({
  state,
  settings,
  onSettingsChange,
  poolSize,
  completedCount,
  onStart,
}: StartViewProps) {
  const isLoading = state.view === "loading";
  const isError = state.view === "error";
  const sliderMax = maxQuizSize(poolSize ?? MIN_QUIZ_SIZE);
  const size = Math.min(settings.size, sliderMax);
  const showProgress =
    settings.mode === "sequential" && poolSize !== null && completedCount !== null;

  return (
    <Card className="quiz-start-card">
      <CardHeader>
        <h2 className="quiz-start-card__heading typo-md">Practice quiz</h2>
      </CardHeader>
      <CardContent className="quiz-start-card__content">
        <p>
          Questions pulled straight from MDN Web Docs, covering HTML, CSS, JavaScript, Web APIs, and
          accessibility. Once loaded, the quiz works fully offline.
        </p>
        <div className="quiz-config">
          <Slider
            className="quiz-config__size"
            minValue={MIN_QUIZ_SIZE}
            maxValue={sliderMax}
            step={QUIZ_SIZE_STEP}
            value={size}
            onChange={(value) => {
              onSettingsChange({ ...settings, size: value as number });
            }}
            isDisabled={sliderMax === MIN_QUIZ_SIZE}
          >
            <div className="quiz-config__size-labels">
              <Label>Number of questions</Label>
              <SliderOutput>
                {({ state: sliderState }) => `${sliderState.getThumbValue(0)} questions`}
              </SliderOutput>
            </div>
          </Slider>
          <RadioGroup
            className="quiz-config__mode"
            value={settings.mode}
            onChange={(value) => {
              onSettingsChange({ ...settings, mode: value as QuizMode });
            }}
          >
            <Label>Question order</Label>
            <RadioGroupItem value="sequential">
              Sequential
              <span className="quiz-config__mode-description">
                Work through the full set — completed questions stay out of the way until you've
                seen them all.
              </span>
            </RadioGroupItem>
            <RadioGroupItem value="random">
              Randomized
              <span className="quiz-config__mode-description">
                A fresh mix each round, favoring questions you've seen least.
              </span>
            </RadioGroupItem>
          </RadioGroup>
          {showProgress ? (
            <p className="quiz-config__progress">
              {completedCount === poolSize
                ? `All ${poolSize} questions completed — your next quiz starts a fresh cycle.`
                : `${completedCount} of ${poolSize} questions completed this cycle.`}
            </p>
          ) : null}
        </div>
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
