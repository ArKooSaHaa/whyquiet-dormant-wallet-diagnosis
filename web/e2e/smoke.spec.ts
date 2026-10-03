import { test, expect } from "@playwright/test";

test("smoke: title and api badge", async ({ page }) => {
  // Pin to seed.sample.json: these tests use known sample wallets; real-data.spec.ts covers seed.json.
  await page.route("**/seed.json", (route) => route.fulfill({ status: 404 }));
  await page.goto("/");
  await expect(page).toHaveTitle(/WhyQuiet/);
  await expect(page.getByTestId("api-badge")).toHaveText(/API ok|API down/);
  await expect(page.getByRole("heading", { name: "Cause Desk" })).toBeVisible();
  await expect(page.getByTestId("sample-banner")).toBeVisible();
});

