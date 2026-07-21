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
        // App shell + build output: precached by default via globPatterns.
        // The bundled quiz data is fetched at runtime, not part of the
        // build, so it needs its own runtime caching strategy.
        runtimeCaching: [
          {
            urlPattern: /\/data\/quiz-index\.json$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "quiz-data" },
          },
        ],
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
