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
});
