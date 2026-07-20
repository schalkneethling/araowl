export const TOPICS = ["html", "css", "javascript", "web-apis", "accessibility"] as const;

export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABELS: Record<Topic, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  "web-apis": "Web APIs",
  accessibility: "Accessibility",
};

export const MDN_PATH_PREFIXES: Record<Topic, readonly string[]> = {
  html: ["/en-US/docs/Web/HTML"],
  css: ["/en-US/docs/Web/CSS"],
  javascript: ["/en-US/docs/Web/JavaScript"],
  "web-apis": ["/en-US/docs/Web/API"],
  accessibility: ["/en-US/docs/Web/Accessibility"],
};
