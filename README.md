# AraOwl 🦉

Test and retain your web development knowledge with quizzes built straight from
[MDN Web Docs](https://developer.mozilla.org/). Study anywhere — quizzes work
fully offline as an installable PWA — covering HTML, CSS, JavaScript, Web APIs,
and Accessibility.

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

CI (GitHub Actions, [`ci.yml`](.github/workflows/ci.yml)) runs the same
matrix on every PR and push to `main` — check/lint/typecheck, unit, e2e,
the axe suite, and VRT through the identical Docker machinery as local
runs. On failure, test results and visual diffs are uploaded as run
artifacts (Actions run page → Artifacts, or `gh run download`). CI needs
no secrets: without `SENTRY_AUTH_TOKEN` the source-map upload plugin
disables itself by design. Node comes from `.node-version` — the same
file `vp env` uses locally.

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

AraOwl is installable, and the bundled quiz works offline once installed —
questions, hints, scoring, and attempt history all function without a
connection, served from the service worker's cache. Anything not already
cached still needs the network: installing the app in the first place,
receiving app updates, and (once they ship) generating AI quizzes.

### macOS: "Data Access Blocked" notification

After opening the installed app on macOS you may see a system notification:
_"AraOwl" tried to access your data from other apps and was blocked._

This is a macOS privacy (TCC) notification about the launcher Chrome creates
for an installed PWA — a small native app that starts Chrome with the right
profile — not about anything AraOwl's own code does; AraOwl is a web app with
no filesystem access. In our testing on macOS the notification appeared once
after install, and the app still launched and worked, including fully
offline. The permission can be managed under System Settings → Privacy &
Security → Files & Folders. Known reports of the same behavior:

- [Apple Community: PWA open issue](https://discussions.apple.com/thread/254923078)
- [Apple Community: About "access data from other apps"](https://discussions.apple.com/thread/255856376)

## Observability

Client errors are reported to Sentry via `@sentry/react` — errors only, and
no PII goes to third parties: no tracing, replay, or session tracking; the
HttpContext and CultureContext integrations are removed and `beforeSend`
strips request and culture context, so events carry no page URL, referrer,
user-agent, locale, or timezone; `sendDefaultPii: false` disables IP
collection. An e2e test asserts the outgoing envelope stays clean of these
fields. The DSN in [`.env.schema`](.env.schema) is
deliberately public: DSNs ship in the client bundle by design and only allow
event submission. Monitoring is disabled on the dev server and active in
built output, with events tagged by `APP_ENV`.

- **Verify the pipeline:** monitoring only runs in built output, so serve a
  production build (`vp build && vp preview`) — not `vp dev` — and open
  `http://localhost:4173/?sentry-test`. A clearly labelled error is thrown
  and should appear in the Sentry dashboard.
- **Source maps:** production builds (`APP_ENV=production`) resolve
  `SENTRY_AUTH_TOKEN` (1Password: `dev` vault → `araowl-sentry` →
  `auth-token`) and upload hidden source maps to Sentry, deleting them from
  `dist/` afterwards so maps are never deployed. Without the token — local
  dev, e2e, the VRT container — the upload plugin disables itself and builds
  proceed normally.

### Analytics (Umami, consent-gated)

Usage analytics run on a self-hosted [Umami](https://umami.is) instance —
cookieless and aggregate-only — and are strictly **opt-in**: nothing loads
from the analytics host unless the visitor allows it via the consent banner
(the first content in the page, rendered as a fixed overlay so appearing
and dismissing never shifts the layout, and revisable later through
"Analytics preferences"). A previously granted choice can be revoked; a revocation
after the script has already loaded takes full effect on the next page load.
Tracked: pageviews plus two custom events, `quiz-started` (`{source}`) and
`quiz-completed` (`{score, total}`) — aggregate numbers, never PII.

### Content Security Policy

Production builds inject a strict `<meta>` CSP (see `cspPlugin` in
`vite.config.ts`): everything is same-origin except the Umami host
(`script-src`/`connect-src`) and the Sentry ingest origin (`connect-src`),
both derived from the env values the code itself uses. The only inline
allowance is `style-src 'unsafe-inline'` — React Aria injects a runtime
`<style>` for pressable touch handling and React sets inline style
attributes; scripts stay locked down. The dev server is exempt (it injects
inline styles for HMR); an e2e test asserts a full quiz run produces zero
CSP violations in built output.

## Deployment (Cloudflare Pages)

Each release is deployed manually with wrangler. Production builds must run
with `APP_ENV=production` so varlock loads [`.env.production`](.env.production)
and resolves the 1Password references via the desktop app — this is also what
enables Sentry source-map upload. CI never needs 1Password: the only secret
any build uses is `SENTRY_AUTH_TOKEN`, and a real environment variable takes
precedence over the `op://` reference, so CI sets it directly as a CI secret.
(The `OP_TOKEN` service-account hook in `.env.schema` exists as an optional
alternative, not a requirement.)

```sh
APP_ENV=production pnpm run build   # typecheck + build + source maps + _headers
pnpm exec wrangler login                      # once
pnpm exec wrangler pages project create araowl   # first deploy only
pnpm exec wrangler pages deploy dist --project-name araowl
```

Security response headers ship via the build-emitted `dist/_headers`
(Cloudflare Pages reads it): the CSP as a real header including
`frame-ancestors 'none'`, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, and a minimal `Permissions-Policy`. On hosts that ignore
`_headers` (e.g. `vp preview` and the e2e webServer) the `<meta>` CSP still
applies, but it is a **partial** fallback only: header-only protections —
`frame-ancestors`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, `nosniff` — cannot be expressed in a `<meta>` tag, so
full protection exists only where the headers are served.

**Custom domain:** in the Cloudflare Pages project add
`araowl.schalkneethling.com`, then CNAME it in Netlify DNS to the project's
assigned `pages.dev` hostname — copy the exact value from the Pages project
overview in the Cloudflare dashboard (for this project name it is
`araowl.pages.dev`). DNS stays on Netlify.

**Recommended:** add a Cloudflare WAF rate-limiting rule for the domain —
the site is static today, but the rule is in place before Phase 4 adds AI
endpoints.

**Post-deploy smoke checks:** open the site → allow analytics → complete a
quiz (pageview + `quiz-started`/`quiz-completed` in Umami); append
`?sentry-test` (error with readable stack in Sentry); install the PWA and
verify the quiz offline; Lighthouse installability pass.

## Secrets

Environment configuration is managed by [Varlock](https://varlock.dev) with the
committed [`.env.schema`](.env.schema). Secret values live in 1Password and are
resolved at build time — nothing sensitive is stored in this repository. The
1Password _references_ (`op://…`) live in the committed
[`.env.production`](.env.production) layer, which only loads when
`APP_ENV=production`, so everyday builds never require 1Password access.

---

Made with love and digital robots by [Schalk Neethling](https://schalkneethling.com).
