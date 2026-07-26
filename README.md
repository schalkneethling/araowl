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
pnpm run test:vrt   # visual regression tests (requires Docker — see below)
pnpm run quality    # format check, lint (oxlint + stylelint), typecheck
```

### Visual regression tests

Screenshot baselines are font-rendering-sensitive, so the VRT suite runs
exclusively inside the official Playwright Docker image (version-pinned
automatically to the installed `@playwright/test`). Local runs and future CI
render on the identical Linux image, which is why only `-linux` baselines are
committed. A Docker engine (e.g. OrbStack) must be running; the first run
installs dependencies inside the container and is slow, subsequent runs reuse
cached volumes.

After an **intentional** visual change, regenerate the baselines and review
every changed PNG before committing — an unreviewed baseline locks in whatever
was rendered, including a broken layout:

```sh
pnpm run test:vrt -- --update-snapshots
```

When a run fails, the diff images (expected / actual / diff) are written to
`test-results/`.

## Installing as an app (PWA)

AraOwl is installable and works fully offline once installed — quizzes, hints,
scoring, and attempt history all function without a connection.

### macOS: "Data Access Blocked" notification

After opening the installed app on macOS you may see a system notification:
_"AraOwl" tried to access your data from other apps and was blocked._

This is a macOS privacy (TCC) notification, not something AraOwl does: when
Chrome installs a PWA it creates a small native launcher app, and that
launcher reads Chrome's own profile data to start up. macOS reports this as
one app accessing another app's data. AraOwl itself is a web app with no
filesystem access. The notification is safe to dismiss and nothing breaks —
it can be managed under System Settings → Privacy & Security → Files &
Folders. Known reports of the same behavior:

- [Apple Community: PWA open issue](https://discussions.apple.com/thread/254923078)
- [Apple Community: Chrome instances in Privacy & Security](https://discussions.apple.com/thread/255822754)
- [Apple Community: About "access data from other apps"](https://discussions.apple.com/thread/255856376)

## Secrets

Environment configuration is managed by [Varlock](https://varlock.dev) with the
committed [`.env.schema`](.env.schema). Secret values live in 1Password and are
resolved at run time — nothing sensitive is stored in this repository.

---

Made with love and digital robots by [Schalk Neethling](https://schalkneethling.com).
