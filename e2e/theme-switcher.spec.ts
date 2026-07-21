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

    // Block the app bundle so React never mounts. Without this, the
    // assertion below would pass even if theme-init.js were completely
    // broken — the ThemeSwitcher's own effect would eventually set the same
    // data-theme once it mounted, since page.goto by default waits for the
    // full "load" event. Aborting the bundle isolates theme-init.js (a
    // render-blocking classic script, not a module) as the only thing that
    // could have set the attribute.
    await page.route("**/assets/*.js", (route) => route.abort());

    await page.goto("/", { waitUntil: "domcontentloaded" });

    expect(await getDataTheme(page)).toBe("dark");
  });
});
