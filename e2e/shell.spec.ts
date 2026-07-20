import { expect, test } from "@playwright/test";

test.describe("app shell", () => {
  test("loads and renders the expected structural landmarks", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("AraOwl");

    const footerLink = page.locator('footer a[href*="schalkneethling.com"]');
    await expect(footerLink).toHaveAttribute("href", /https:\/\/schalkneethling\.com/);

    await expect(page.locator("#theme-root")).toBeAttached();
    await expect(page.locator("#quiz-root")).toBeAttached();
  });

  test("skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Skip to main content" }).press("Enter");

    await expect(page.locator("#main-content")).toBeFocused();
  });
});
