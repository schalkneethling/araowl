import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { ENV } from "varlock/env";
import { defaultExclude, defineConfig, type PluginOption } from "vite-plus";
import { VitePWA } from "vite-plugin-pwa";

// Third-party origins derive from the same env values the code uses, so the
// CSP can never drift from the actual integrations.
const umamiOrigin = ENV.UMAMI_SCRIPT_URL ? new URL(ENV.UMAMI_SCRIPT_URL).origin : "";
const sentryIngestOrigin = ENV.SENTRY_DSN ? new URL(ENV.SENTRY_DSN).origin : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' ${umamiOrigin}`.trim(),
  `connect-src 'self' ${umamiOrigin} ${sentryIngestOrigin}`.replaceAll(/ +/g, " ").trim(),
  // No data: allowance — nothing in the built output uses data: images
  // (verified against dist CSS, source, and the manifest).
  "img-src 'self'",
  // 'unsafe-inline' is a deliberate trade-off: React Aria injects a runtime
  // <style> (touch-action for pressables) and React sets inline style
  // attributes; hash-pinning the injected content would break touch handling
  // silently on library upgrades. Style injection is not a meaningful vector
  // here — no user-supplied HTML is ever rendered — while scripts stay
  // locked to 'self' + the analytics host.
  "style-src 'self' 'unsafe-inline'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Build-only: the dev server injects inline <style> elements for CSS
// modules/HMR, which a strict CSP would break — production output is what
// the policy protects and what e2e verifies (the suite tests built output).
//
// The policy ships twice, deliberately:
// - as a real response header via the emitted Cloudflare Pages `_headers`
//   file — headers apply before parsing and support header-only directives
//   (frame-ancestors, which a <meta> CSP cannot express, is the
//   clickjacking defense for the destructive history actions);
// - as a <meta> tag — fallback coverage for any host that ignores
//   `_headers` (vp preview, the e2e webServer), which also keeps the
//   zero-CSP-violations e2e guard meaningful.
// Both derive from the same constant, so they cannot drift.
const cspPlugin: PluginOption = {
  name: "araowl:csp",
  apply: "build",
  transformIndexHtml(html: string) {
    return {
      html,
      tags: [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: contentSecurityPolicy },
          injectTo: "head-prepend" as const,
        },
      ],
    };
  },
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "_headers",
      source: [
        "/*",
        `  Content-Security-Policy: ${contentSecurityPolicy}; frame-ancestors 'none'`,
        "  X-Frame-Options: DENY",
        "  X-Content-Type-Options: nosniff",
        "  Referrer-Policy: strict-origin-when-cross-origin",
        // Baseline limited-availability (see MDN): browsers without support
        // ignore the header. Pure progressive hardening — nothing in the app
        // requests these capabilities, so no functionality depends on it.
        "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
        "",
      ].join("\n"),
    });
  },
};

export default defineConfig({
  plugins: [
    // First so .env.schema is loaded/validated before anything else runs;
    // public vars become available via `import { ENV } from "varlock/env"`.
    varlockVitePlugin(),
    cspPlugin,
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Precache the small icons only: favicon.svg (2.7 MB of embedded
      // raster data) and the 512px manifest icon (541 KB) are deliberately
      // excluded — neither is needed for offline quiz play.
      includeAssets: [
        "favicon.ico",
        "favicon-96x96.png",
        "apple-touch-icon.png",
        "web-app-manifest-192x192.png",
      ],
      // Off because it would auto-precache every manifest icon, including
      // the 541 KB 512px one the includeAssets list deliberately omits.
      includeManifestIcons: false,
      manifest: {
        name: "AraOwl",
        short_name: "AraOwl",
        description:
          "Test and sharpen your web platform knowledge with quizzes built from MDN Web Docs — works fully offline once installed.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#005f73",
        background_color: "#ffffff",
        // RealFaviconGenerator assets. RFG declares these purpose:maskable;
        // the 512 is also listed as purpose:any so launchers that need an
        // uncropped icon never fall back to cropping a maskable one.
        icons: [
          {
            src: "/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // App shell + build output: precached via globPatterns. Workbox's
        // default set (js/wasm/css/html) omits JSON, so the bundled quiz data
        // is added explicitly — precaching it at install time makes the quiz
        // playable offline immediately, without first fetching it online by
        // starting a quiz. It's a build artifact, so it updates atomically
        // with each deploy via the autoUpdate service worker.
        globPatterns: ["**/*.{js,wasm,css,html}", "data/quiz-index.json"],
        // The SW is generated after the Sentry plugin's map cleanup and the
        // browser SDK can't use worker maps anyway — without this, sw.js.map
        // would be the one map file that still reached production.
        sourcemap: false,
      },
    }),
    // Last so it sees final build output. Uploads hidden source maps to
    // Sentry, then deletes them from dist so maps are never deployed. Only
    // active when the auth token resolved (APP_ENV=production builds); the
    // org is inferred from the org auth token.
    sentryVitePlugin({
      project: "araowl",
      authToken: ENV.SENTRY_AUTH_TOKEN,
      disable: !ENV.SENTRY_AUTH_TOKEN,
      telemetry: false,
      sourcemaps: {
        filesToDeleteAfterUpload: "dist/**/*.map",
      },
    }),
  ],
  build: {
    // Maps exist for Sentry only ("hidden": no sourceMappingURL comment in
    // the served JS), so they are generated under the same predicate that
    // enables the upload plugin — tokenless builds (dev, e2e, VRT) emit none,
    // and uploads always delete them from dist afterwards.
    sourcemap: ENV.SENTRY_AUTH_TOKEN ? "hidden" : false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
      "@shared": fileURLToPath(new URL("shared", import.meta.url)),
    },
  },
  fmt: {
    // env.d.ts is autogenerated by varlock (@generateTypes) with trailing
    // hard-break spaces in its JSDoc; formatting it strips them, so every
    // build regenerates a "dirty" file and every format flips it back —
    // permanent churn. The generated form is canonical; leave it alone.
    ignorePatterns: ["env.d.ts"],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    options: { typeAware: true, typeCheck: true },
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
  },
  staged: {
    "*": "vp check --fix",
  },
  test: {
    // Playwright specs live in e2e/ and must not run under Vitest
    exclude: [...defaultExclude, "e2e/**"],
  },
});
