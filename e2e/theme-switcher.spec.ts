import { expect, test, type Page } from "@playwright/test";
import { resetClientState } from "./helpers/quiz.ts";

function getDataTheme(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

test.beforeEach(async ({ page }) => {
  await resetClientState(page);
});

test.describe("theme switcher", () => {
  test("defaults to system with no data-theme attribute", async ({ page }) => {
    await expect(page.getByRole("radio", { name: "System" })).toBeChecked();
    expect(await getDataTheme(page)).toBeNull();
  });

  test("clicking each option sets data-theme and persists across reload", async ({ page }) => {
    await page.getByRole("radio", { name: "Dark" }).click({ force: true });
    expect(await getDataTheme(page)).toBe("dark");
    await page.reload();
    expect(await getDataTheme(page)).toBe("dark");
    await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();

    await page.getByRole("radio", { name: "Light" }).click({ force: true });
    expect(await getDataTheme(page)).toBe("light");
    await page.reload();
    expect(await getDataTheme(page)).toBe("light");

    await page.getByRole("radio", { name: "System" }).click({ force: true });
    expect(await getDataTheme(page)).toBeNull();
    await page.reload();
    expect(await getDataTheme(page)).toBeNull();
    await expect(page.getByRole("radio", { name: "System" })).toBeChecked();
  });

  test("keyboard: arrow keys move between options and update data-theme", async ({ page }) => {
    // Rendered order is System, Light, Dark.
    await page.getByRole("radio", { name: "System" }).focus();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
    expect(await getDataTheme(page)).toBe("light");

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(await getDataTheme(page)).toBe("dark");

    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
    expect(await getDataTheme(page)).toBe("light");

    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("radio", { name: "System" })).toBeChecked();
    expect(await getDataTheme(page)).toBeNull();
  });

  test("applies a stored preference before first paint (no FOUC)", async ({ page }) => {
    // Simulate a returning visitor: seed the preference the way the app
    // itself persists it, before any app script runs.
    await page.addInitScript(() => {
      localStorage.setItem("araowl:theme-preference", "dark");
    });

    await page.goto("/");

    // theme-init.js is a render-blocking classic script, so data-theme must
    // already be set the moment the document is available — not merely by
    // the time React has hydrated the switcher.
    expect(await getDataTheme(page)).toBe("dark");
  });
});
