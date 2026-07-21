import fs from "node:fs/promises";
import { formatFullReport } from "@schalkneethling/axe-aggregate-reporter";
import { expect, test } from "./fixtures/axe.ts";

test("home page has no detectable accessibility violations", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await page.goto("/");

  const results = await makeAxeBuilder().analyze();
  const file = testInfo.outputPath("axe.json");

  await fs.writeFile(file, JSON.stringify(formatFullReport(results), null, 2));
  await testInfo.attach("axe.json", {
    contentType: "application/json",
    path: file,
  });

  expect(results.violations).toEqual([]);
});

test("home page in dark theme has no detectable accessibility violations", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Dark" }).click({ force: true });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const results = await makeAxeBuilder().analyze();
  const file = testInfo.outputPath("axe-dark.json");

  await fs.writeFile(file, JSON.stringify(formatFullReport(results), null, 2));
  await testInfo.attach("axe-dark.json", {
    contentType: "application/json",
    path: file,
  });

  expect(results.violations).toEqual([]);
});
