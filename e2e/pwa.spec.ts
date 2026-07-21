import { expect, test } from "@playwright/test";
import { resetClientState, startQuiz } from "./helpers/quiz.ts";

test.describe("PWA", () => {
  test("exposes an installable manifest with the expected icons", async ({ page }) => {
    await resetClientState(page);

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestHref).toBe("/manifest.webmanifest");

    const manifest = await page.evaluate(async (href) => {
      const response = await fetch(href as string);
      return response.json();
    }, manifestHref);

    expect(manifest.name).toBe("AraOwl");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([expect.objectContaining({ sizes: "192x192" })]),
    );
  });

  test("bundled quiz remains playable offline once the service worker is active", async ({
    page,
    context,
    browserName,
  }) => {
    // Playwright's WebKit doesn't reliably serve navigations/fetches through
    // an active service worker once offline (unlike real Safari) — this
    // guards Chromium's behavior; cross-browser SW parity isn't something
    // this test suite can verify.
    test.skip(browserName === "webkit", "Playwright WebKit does not serve offline SW requests");

    await resetClientState(page);

    // The service worker calls clientsClaim(), but the very first navigation
    // still loads before it exists — reload once so the page itself is
    // served under an active, controlling worker before going offline.
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), {
      timeout: 15_000,
    });
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

    // quiz-index.json is only cached (StaleWhileRevalidate) once actually
    // requested, so start the quiz once online to warm the runtime cache.
    await startQuiz(page);
    await page.reload();

    await context.setOffline(true);
    try {
      await expect(page.locator("h1")).toContainText("AraOwl");
      await startQuiz(page);
    } finally {
      await context.setOffline(false);
    }
  });
});
