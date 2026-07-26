import { defineConfig, devices } from "@playwright/test";

// Visual regression config. Run exclusively inside the version-pinned
// Playwright Docker image via `pnpm test:vrt` — font rasterization differs
// across operating systems, so baselines are only meaningful when every run
// (local today, CI later) renders on the identical Linux image. The committed
// baselines in e2e/*-snapshots/ therefore all carry the -linux suffix.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.vrt.spec.ts",
  reporter: [["list"]],
  webServer: {
    // Build first: vp preview serves whatever is in dist/, which would
    // otherwise silently test stale output.
    command: "vp build && vp preview --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:4173",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 15"] },
    },
  ],
});
