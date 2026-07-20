import type { QuizIndex, QuizQuestion } from "@shared/schema";

/** A single valid question; override any field to build variants. */
export function makeQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: "q-html-1",
    topic: "html",
    question: "Which HTML element represents the most important heading?",
    options: ["<h1>", "<h6>", "<header>", "<title>"],
    answerIndex: 0,
    hints: ["Headings range from h1 to h6."],
    explanation: "The <h1> element represents the top-level heading of a document.",
    mdnUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
    ...overrides,
  };
}

/** Three questions across two topics, used by engine and scoring tests. */
export const threeQuestions: QuizQuestion[] = [
  makeQuestion({ id: "q1", topic: "html", answerIndex: 0, hints: ["hint 1", "hint 2", "hint 3"] }),
  makeQuestion({
    id: "q2",
    topic: "css",
    question: "Which CSS property controls text color?",
    answerIndex: 2,
    options: ["background", "font", "color", "fill"],
    hints: ["It is a very short property name."],
    mdnUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/color",
  }),
  makeQuestion({
    id: "q3",
    topic: "html",
    question: "Which attribute provides alternative text for an image?",
    answerIndex: 1,
    options: ["src", "alt", "title", "aria-label"],
    hints: ["It is three letters."],
    mdnUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img",
  }),
];

/** A minimal valid quiz index wrapping the given questions. */
export function makeQuizIndex(
  questions: QuizQuestion[] = [makeQuestion()],
  overrides: Partial<QuizIndex> = {},
): QuizIndex {
  return {
    version: 1,
    generatedAt: "2026-07-19T00:00:00.000Z",
    source: "bundled",
    questions,
    ...overrides,
  };
}
