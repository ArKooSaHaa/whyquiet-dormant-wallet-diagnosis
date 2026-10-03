import { test, expect } from "@playwright/test";

// Runs on the real web/public/seed.json (exported by scripts/export_seed.py). No wallet ids are
// hard-coded, so a re-export never breaks it. The other specs pin to seed.sample.json.
test.describe("Real seed.json", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/");
    await expect(page.getByTestId("queue-table")).toBeVisible();
  });

  test("loads real data, not the sample", async ({ page }) => {
    await expect(page.getByTestId("sample-banner")).toHaveCount(0);
  });

  test("a refused wallet shows the refusal headline and model reasons", async ({ page }) => {
    await page.getByTestId("filter-verdict").selectOption("refused");
    await page.getByTestId("queue-table").locator("tbody tr").first().click();
    await expect(page.getByTestId("refusal-headline")).toContainText("No attributable cause");
    await expect(page.getByTestId("refusal-reasons-list").locator("li").first()).toContainText(/tau|delta/);
  });

  test("an attributed wallet shows its remedy and decline chart", async ({ page }) => {
    await page.getByTestId("filter-verdict").selectOption("attributed");
    await page.getByTestId("queue-table").locator("tbody tr").first().click();
    await expect(page.getByTestId("remedy-card")).toBeVisible();
    await expect(page.getByTestId("decline-shape-card").locator(".recharts-area-curve")).toBeVisible();
  });
});
