import * as v from "valibot";
import { TOPICS } from "@shared/topics";

/** A single MDN quiz question with exactly four options and one correct answer. */
export const QuizQuestionSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty("Question id must not be empty")),
  topic: v.picklist(TOPICS),
  question: v.pipe(v.string(), v.minLength(10, "Question must be at least 10 characters")),
  options: v.pipe(
    v.array(v.pipe(v.string(), v.nonEmpty("Option must not be empty"))),
    v.length(4, "Exactly 4 options are required"),
    v.check((options) => new Set(options).size === options.length, "Options must be unique"),
  ),
  answerIndex: v.pipe(
    v.number(),
    v.integer("answerIndex must be an integer"),
    v.minValue(0),
    v.maxValue(3),
  ),
  hints: v.pipe(
    v.array(v.pipe(v.string(), v.nonEmpty("Hint must not be empty"))),
    v.minLength(1, "At least 1 hint is required"),
    v.maxLength(3, "At most 3 hints are allowed"),
  ),
  explanation: v.pipe(v.string(), v.nonEmpty("Explanation must not be empty")),
  mdnUrl: v.pipe(
    v.string(),
    v.startsWith("https://developer.mozilla.org/", "mdnUrl must point to MDN"),
  ),
});

export type QuizQuestion = v.InferOutput<typeof QuizQuestionSchema>;

/** The bundled or AI-generated quiz manifest fetched by the app. */
export const QuizIndexSchema = v.object({
  version: v.literal(1),
  generatedAt: v.pipe(v.string(), v.isoTimestamp("generatedAt must be an ISO-8601 timestamp")),
  source: v.picklist(["bundled", "ai"]),
  questions: v.pipe(
    v.array(QuizQuestionSchema),
    v.minLength(1, "A quiz must contain at least 1 question"),
  ),
});

export type QuizIndex = v.InferOutput<typeof QuizIndexSchema>;

const TopicScoreSchema = v.object({
  correct: v.pipe(v.number(), v.integer(), v.minValue(0)),
  total: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

const AttemptAnswerSchema = v.object({
  questionId: v.pipe(v.string(), v.nonEmpty()),
  chosenIndex: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(3)),
  correct: v.boolean(),
  hintsUsed: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(3)),
});

/** A recorded, completed quiz run persisted to a ScoreStore. */
export const QuizAttemptSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  anonUserId: v.pipe(v.string(), v.nonEmpty()),
  startedAt: v.pipe(v.string(), v.isoTimestamp()),
  finishedAt: v.pipe(v.string(), v.isoTimestamp()),
  source: v.picklist(["bundled", "ai"]),
  topics: v.array(v.picklist(TOPICS)),
  answers: v.array(AttemptAnswerSchema),
  score: v.object({
    correct: v.pipe(v.number(), v.integer(), v.minValue(0)),
    total: v.pipe(v.number(), v.integer(), v.minValue(1)),
    byTopic: v.record(v.picklist(TOPICS), TopicScoreSchema),
  }),
});

export type QuizAttempt = v.InferOutput<typeof QuizAttemptSchema>;

/** Parse and validate a quiz index, throwing a valibot error on any violation. */
export function parseQuizIndex(data: unknown): QuizIndex {
  return v.parse(QuizIndexSchema, data);
}

/** Safely parse a quiz index, returning a result object instead of throwing. */
export function safeParseQuizIndex(data: unknown): v.SafeParseResult<typeof QuizIndexSchema> {
  return v.safeParse(QuizIndexSchema, data);
}
