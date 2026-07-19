# AraOwl 🦉

Test and retain your web development knowledge with quizzes built straight from
[MDN Web Docs](https://developer.mozilla.org/). Study anywhere — quizzes work
fully offline as an installable PWA — and build custom AI-generated quizzes on
the topics you care about: HTML, CSS, JavaScript, Web APIs, and Accessibility.

> **Status:** work in progress, built in reviewable phases. This README grows
> with the project; full setup and deployment docs land with the final phase.

## Development

This project uses [Vite+](https://viteplus.dev) (`vp`) with pnpm.

```sh
vp install        # install dependencies
vp dev            # start the dev server
vp test           # unit tests (Vitest)
pnpm run test:e2e   # Playwright end-to-end tests
pnpm run test:a11y  # axe accessibility suite (aggregate report via axe-aggregate-reporter)
pnpm run quality    # format check, lint (oxlint + stylelint), typecheck
```

## Secrets

Environment configuration is managed by [Varlock](https://varlock.dev) with the
committed [`.env.schema`](.env.schema). Secret values live in 1Password and are
resolved at run time — nothing sensitive is stored in this repository.

---

Made with love and digital robots by [Schalk Neethling](https://schalkneethling.com).
