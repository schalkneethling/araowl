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
