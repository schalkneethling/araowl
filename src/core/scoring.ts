import type { QuizAttempt, QuizQuestion } from "@shared/schema";
import type { Topic } from "@shared/topics";
import type { AnswerRecord, QuizState } from "@/core/engine";

export interface TopicScore {
  correct: number;
  total: number;
}

export interface Score {
  correct: number;
  total: number;
  byTopic: Partial<Record<Topic, TopicScore>>;
}

/**
 * Compute the overall and per-topic score for a set of answers. `byTopic` only
 * contains topics that appear in `questions`.
 */
export function computeScore(questions: QuizQuestion[], answers: AnswerRecord[]): Score {
  const topicOf = new Map<string, Topic>();
  const byTopic: Partial<Record<Topic, TopicScore>> = {};

  for (const question of questions) {
    topicOf.set(question.id, question.topic);
    (byTopic[question.topic] ??= { correct: 0, total: 0 }).total += 1;
  }

  let correct = 0;
  for (const answer of answers) {
    if (!answer.correct) {
      continue;
    }
    correct += 1;
    const topic = topicOf.get(answer.questionId);
    if (topic) {
      (byTopic[topic] ??= { correct: 0, total: 0 }).correct += 1;
    }
  }

  return { correct, total: questions.length, byTopic };
}

/** Unique topics appearing in the quiz, in first-seen order. */
function topicsIn(questions: QuizQuestion[]): Topic[] {
  const seen = new Set<Topic>();
  for (const question of questions) {
    seen.add(question.topic);
  }
  return [...seen];
}

/** Build a persistable QuizAttempt from a completed (or in-progress) state. */
export function buildAttempt(
  state: QuizState,
  opts: { anonUserId: string; finishedAt: string; id?: string },
): QuizAttempt {
  return {
    id: opts.id ?? crypto.randomUUID(),
    anonUserId: opts.anonUserId,
    startedAt: state.startedAt,
    finishedAt: opts.finishedAt,
    source: state.source,
    topics: topicsIn(state.questions),
    answers: state.answers.map((answer) => ({ ...answer })),
    score: computeScore(state.questions, state.answers),
  };
}
