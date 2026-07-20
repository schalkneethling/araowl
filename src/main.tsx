import "./styles/global.css";

import { QuizApp } from "@/app/quiz-app";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// React islands (theme switcher, quiz app, etc.) mount into their respective
// #theme-root / #quiz-root containers in later phases.

const quizRoot = document.getElementById("quiz-root");
if (quizRoot) {
  createRoot(quizRoot).render(
    <StrictMode>
      <QuizApp />
    </StrictMode>,
  );
}
