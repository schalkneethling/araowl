import { describe, expect, it } from "vite-plus/test";
import { makeQuestion, threeQuestions } from "@shared/__fixtures__/quiz-fixtures";
import {
  advance,
  answerQuestion,
  createQuizState,
  currentQuestion,
  isComplete,
  progress,
  type QuizState,
  revealHint,
} from "@/core/engine";

const start = () => createQuizState(threeQuestions, { source: "bundled" });

describe("createQuizState", () => {
  it("throws on empty questions", () => {
    expect(() => createQuizState([], { source: "bundled" })).toThrow(/no questions/);
  });

  it("initializes at the first question in the question phase", () => {
    const state = start();
    expect(state.currentIndex).toBe(0);
    expect(state.phase).toBe("question");
    expect(state.hintsRevealed).toBe(0);
    expect(state.answers).toEqual([]);
    expect(state.source).toBe("bundled");
    expect(currentQuestion(state).id).toBe("q1");
    expect(progress(state)).toEqual({ current: 1, total: 3 });
  });
});

describe("revealHint", () => {
  it("increments hintsRevealed up to the question's available hints", () => {
    // q1 has 3 hints.
    let state = start();
    state = revealHint(state);
    expect(state.hintsRevealed).toBe(1);
    state = revealHint(state);
    state = revealHint(state);
    expect(state.hintsRevealed).toBe(3);
  });

  it("throws when revealing beyond the available hints", () => {
    // q2 has a single hint.
    let state = answerQuestion(start(), 0); // answer q1
    state = advance(state); // move to q2
    state = revealHint(state);
    expect(state.hintsRevealed).toBe(1);
    expect(() => revealHint(state)).toThrow(/hint/i);
  });

  it("caps at 3 even if a question somehow had more hints", () => {
    // Guard: the cap constant is 3; a 3-hint question hits it exactly.
    let state = start();
    state = revealHint(revealHint(revealHint(state)));
    expect(() => revealHint(state)).toThrow(/hint/i);
  });

  it("throws when not in the question phase", () => {
    const state = answerQuestion(start(), 0); // now in feedback
    expect(() => revealHint(state)).toThrow(/hint/i);
  });
});

describe("answerQuestion", () => {
  it("records a correct answer and moves to feedback", () => {
    const state = answerQuestion(start(), 0);
    expect(state.phase).toBe("feedback");
    expect(state.answers).toHaveLength(1);
    expect(state.answers[0]).toEqual({
      questionId: "q1",
      chosenIndex: 0,
      correct: true,
      hintsUsed: 0,
    });
  });

  it("records an incorrect answer", () => {
    const state = answerQuestion(start(), 3);
    expect(state.answers[0].correct).toBe(false);
  });

  it("records hintsUsed from hintsRevealed", () => {
    let state = revealHint(revealHint(start()));
    state = answerQuestion(state, 0);
    expect(state.answers[0].hintsUsed).toBe(2);
  });

  it("throws when answering outside the question phase", () => {
    const state = answerQuestion(start(), 0); // feedback
    expect(() => answerQuestion(state, 1)).toThrow(/question. phase/);
  });

  it("throws on an out-of-range chosenIndex", () => {
    expect(() => answerQuestion(start(), 4)).toThrow(/out of range/);
  });
});

describe("advance", () => {
  it("moves to the next question and resets hintsRevealed", () => {
    let state = revealHint(revealHint(start()));
    state = answerQuestion(state, 0);
    state = advance(state);
    expect(state.currentIndex).toBe(1);
    expect(state.phase).toBe("question");
    expect(state.hintsRevealed).toBe(0);
    expect(currentQuestion(state).id).toBe("q2");
  });

  it("completes after the last question", () => {
    let state = start();
    for (let i = 0; i < 3; i++) {
      state = answerQuestion(state, 0);
      state = advance(state);
    }
    expect(state.phase).toBe("complete");
    expect(isComplete(state)).toBe(true);
    expect(state.answers).toHaveLength(3);
  });

  it("throws when advancing outside the feedback phase", () => {
    expect(() => advance(start())).toThrow(/feedback. phase/);
  });

  it("throws when advancing from the complete phase", () => {
    let state = start();
    for (let i = 0; i < 3; i++) {
      state = answerQuestion(state, 0);
      state = advance(state);
    }
    expect(() => advance(state)).toThrow(/feedback. phase/);
  });
});

describe("serializability", () => {
  it("state survives a JSON round-trip unchanged", () => {
    let state: QuizState = revealHint(start());
    state = answerQuestion(state, 0);
    const roundTripped = JSON.parse(JSON.stringify(state));
    expect(roundTripped).toEqual(state);
  });

  it("state survives structuredClone unchanged", () => {
    const state = answerQuestion(revealHint(start()), 0);
    expect(structuredClone(state)).toEqual(state);
  });

  it("transitions do not mutate the previous state", () => {
    const original = start();
    const snapshot = structuredClone(original);
    answerQuestion(original, 0);
    revealHint(original);
    expect(original).toEqual(snapshot);
  });
});

describe("currentQuestion on a single-question quiz", () => {
  it("returns the only question", () => {
    const state = createQuizState([makeQuestion({ id: "solo" })], { source: "ai" });
    expect(currentQuestion(state).id).toBe("solo");
    expect(state.source).toBe("ai");
  });
});
