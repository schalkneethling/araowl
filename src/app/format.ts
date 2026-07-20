import type { QuizAttempt } from "@shared/schema";
import { TOPIC_LABELS, TOPICS } from "@shared/topics";

/** Format an ISO timestamp as a locale-aware date and time for display. */
export function formatAttemptDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

/** A short "HTML 2/2, CSS 1/2" summary of an attempt's per-topic score. */
export function topicSummary(attempt: QuizAttempt): string {
  return TOPICS.filter((topic) => attempt.score.byTopic[topic])
    .map((topic) => {
      const topicScore = attempt.score.byTopic[topic];
      return `${TOPIC_LABELS[topic]} ${topicScore?.correct ?? 0}/${topicScore?.total ?? 0}`;
    })
    .join(", ");
}
