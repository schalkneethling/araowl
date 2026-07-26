import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defaultExclude, defineConfig } from "vite-plus";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
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
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
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
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
      "@shared": fileURLToPath(new URL("shared", import.meta.url)),
    },
  },
  fmt: {},
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
