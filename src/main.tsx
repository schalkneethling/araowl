import "./styles/global.css";

import { QuizApp } from "@/app/quiz-app";
import { ThemeSwitcher } from "@/app/theme/theme-switcher";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const themeRoot = document.getElementById("theme-root");
if (themeRoot) {
  createRoot(themeRoot).render(
    <StrictMode>
      <ThemeSwitcher />
    </StrictMode>,
  );
}

const quizRoot = document.getElementById("quiz-root");
if (quizRoot) {
  createRoot(quizRoot).render(
    <StrictMode>
      <QuizApp />
    </StrictMode>,
  );
}
