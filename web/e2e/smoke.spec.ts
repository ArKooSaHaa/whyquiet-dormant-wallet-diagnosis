import { test, expect } from "@playwright/test";

test("smoke: title and api badge", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/WhyQuiet/);
  await expect(page.getByTestId("api-badge")).toHaveText(/API ok|API down/);
  await expect(page.getByRole("heading", { name: "Cause Desk" })).toBeVisible();
});
