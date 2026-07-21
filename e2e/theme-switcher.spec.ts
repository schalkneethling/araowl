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

  // No keyboard-navigation test here: arrow-key movement between options is
  // React Aria's implemented ARIA radiogroup pattern (the platform's job,
  // already covered by its own test suite), and the app-specific behavior it
  // would otherwise exercise — selecting an option applies the theme — is
  // already covered by the click-based test above.

  test("theme-init.js applies a stored preference independent of the app bundle", async ({
    page,
  }) => {
    // This proves theme-init.js's own logic is correct in isolation — not
    // that there is no visible flash, which would require capturing paint
    // timing, not just reading the attribute's final value.
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
