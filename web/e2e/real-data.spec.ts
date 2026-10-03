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

  test("the inactive-window shading covers exactly the silent weeks", async ({ page, request }) => {
    // A wallet acquired after week 0, so list position and week number differ.
    type W = { wallet_id: string; weeks_silent: number; series: { week: number }[] };
    const { wallets } = (await (await request.get("/seed.json")).json()) as { wallets: W[] };
    const w = wallets.find((x) => x.series[0].week > 5)!;
    await page.goto(`/#/w/${w.wallet_id}`);
    const card = page.getByTestId("decline-shape-card");

    // Points sit evenly across the plot area (the grid) from the first week to week 51.
    const n = w.series.length;
    const geometry = async () => {
      const plot = (await card.locator(".recharts-cartesian-grid").boundingBox())!;
      const shade = (await card.locator(".recharts-reference-area-rect").boundingBox())!;
      const step = plot.width / (n - 1);
      return [shade.x - (plot.x + (n - w.weeks_silent) * step), shade.x + shade.width - (plot.x + plot.width)];
    };
    await expect.poll(async () => (await geometry()).map((d) => Math.abs(d) < 3)).toEqual([true, true]);
  });

  test("an attributed wallet shows its remedy and decline chart", async ({ page }) => {
    await page.getByTestId("filter-verdict").selectOption("attributed");
    await page.getByTestId("queue-table").locator("tbody tr").first().click();
    await expect(page.getByTestId("remedy-card")).toBeVisible();
    await expect(page.getByTestId("decline-shape-card").locator(".recharts-area-curve")).toBeVisible();
  });
});
