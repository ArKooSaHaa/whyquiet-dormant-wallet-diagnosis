import { test, expect } from "@playwright/test";

test.describe("Wallet Detail & Refusal Page", () => {
  test("attributed wallet: displays remedy, bilingual copy, decline shape, and posterior charts", async ({ page }) => {
    // Navigate to known attributed wallet from sample seed
    await page.goto("/#/w/W-7K9A1B");

    // Check Header & Verdict
    await expect(page.getByTestId("wallet-id-header")).toHaveText("W-7K9A1B");
    await expect(page.getByTestId("wallet-verdict-chip")).toHaveText("Attributed");

    // Check Rule vs Model comparison
    await expect(page.getByTestId("rule-vs-model-card")).toBeVisible();
    await expect(page.getByTestId("rule-vs-model-card")).toContainText("Message Everyone");

    // Check Attributed Remedy Card
    const remedyCard = page.getByTestId("remedy-card");
    await expect(remedyCard).toBeVisible();
    await expect(page.getByTestId("remedy-label")).toBeVisible();
    await expect(page.getByTestId("remedy-msg-en")).toBeVisible();
    await expect(page.getByTestId("remedy-msg-bn")).toBeVisible();

    // Check Charts & Feature Attributions
    await expect(page.getByTestId("decline-shape-card")).toBeVisible();
    await expect(page.getByTestId("posterior-chart-card")).toBeVisible();
    await expect(page.getByTestId("contributions-card")).toBeVisible();
  });

  test("refused wallet: displays exact refusal headline, reasons, and no action buttons", async ({ page }) => {
    // Navigate to known refused wallet from sample seed
    await page.goto("/#/w/W-6B8C1D");

    // Check Header & Verdict
    await expect(page.getByTestId("wallet-id-header")).toHaveText("W-6B8C1D");
    await expect(page.getByTestId("wallet-verdict-chip")).toHaveText("Refused");

    // Check Dedicated Refusal Panel & exact headline
    const refusalPanel = page.getByTestId("refusal-panel");
    await expect(refusalPanel).toBeVisible();
    await expect(page.getByTestId("refusal-headline")).toHaveText(
      "No attributable cause. I will not spend your money here."
    );

    // Check refusal reasons list
    const reasonsList = page.getByTestId("refusal-reasons-list");
    await expect(reasonsList).toBeVisible();
    await expect(reasonsList.locator("li")).not.toHaveCount(0);

    // Verify NO action buttons exist on the refusal card
    await expect(refusalPanel.locator("button")).toHaveCount(0);

    // Check decline shape and posterior charts are rendered
    await expect(page.getByTestId("decline-shape-card")).toBeVisible();
    await expect(page.getByTestId("posterior-chart-card")).toBeVisible();
  });

  test("empty state: shows helpful not-found message and returns to queue", async ({ page }) => {
    await page.goto("/#/w/W-UNKNOWN99");

    await expect(page.getByTestId("wallet-not-found-state")).toBeVisible();
    await page.getByTestId("back-to-queue-btn").click();

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByTestId("queue-view")).toBeVisible();
  });

  test("back button in header returns to triage queue", async ({ page }) => {
    await page.goto("/#/w/W-7K9A1B");
    await page.getByTestId("back-button").click();

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByTestId("queue-view")).toBeVisible();
  });
});
