<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# AraOwl Project Principles

These are non-negotiable for this project. They apply to every phase, every subagent, and every review pass.

## Technical accuracy is critical

AraOwl teaches web platform knowledge sourced from MDN. A wrong answer, a misleading explanation, or a stale MDN link actively misinforms someone learning. Treat this with the same seriousness as a correctness bug in the code itself.

- Every question, answer, hint, and explanation must be verifiably correct against current MDN documentation — not against training-data memory, which may be outdated (MDN URLs and content change; see the 2026 restructure, e.g. CSS properties moving under `/Reference/Properties/`).
- Never assert a technical claim you have not grounded against the linked source. If you're not sure, say so, or verify by fetching the actual MDN page rather than guessing.
- When generating or reviewing quiz content (hand-authored or AI-generated), the `mdnUrl` on a question must actually support the stated correct answer — a plausible-sounding but ungrounded question is worse than an obviously-missing one.
- The footer's "File an issue" link exists because mistakes happen despite best efforts — it is a safety net, not a substitute for verifying accuracy before shipping.

## Every surface and every input method matters equally

There is no "primary" platform or input method for AraOwl. Mobile, tablet, and desktop are equally in scope, as are mouse, keyboard, touch, other pointer devices, and screen readers / assistive tech.

- Never validate a UI change on one surface or input method and call it done. A change verified only in a desktop browser with a mouse is not verified.
- Keyboard-only operation and screen reader announcements are first-class acceptance criteria, not an accessibility pass tacked on at the end.
- Layout and interaction must hold up across viewport sizes — verify responsive behavior, not just that a fixed-width screenshot looks right.
- axe scans and semantic/keyboard e2e tests catch a lot but not everything (e.g. visual layout collapse, touch target sizing) — pair automated checks with actual cross-surface verification (see the visual-verification lesson from Phase 1's radio-group bug).
