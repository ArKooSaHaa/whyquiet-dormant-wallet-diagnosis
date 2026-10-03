import { test, expect } from "@playwright/test";

test.describe("Batches & Governance Page", () => {
  test("loads batches view and displays governance list", async ({ page }) => {
    await page.goto("/#/batches");

    await expect(page.getByTestId("batches-view")).toBeVisible();
    await expect(page.getByTestId("propose-batch-card")).toBeVisible();
    await expect(page.getByTestId("batches-list-card")).toBeVisible();
    await expect(page.getByTestId("batches-table")).toBeVisible();
  });

  test("analyst propose flow: displays remedy preview, cost with ASSUMED, and creates batch", async ({ page }) => {
    await page.goto("/#/batches");

    // Sign in as Analyst via navbar or button
    await page.getByTestId("open-login-btn").click();
    await page.getByTestId("login-role-analyst").click();
    await page.getByTestId("login-submit-btn").click();

    // Verify session via profile avatar
    await expect(page.getByTestId("profile-avatar-btn")).toBeVisible();

    // Check eligible wallets & cost calculation
    const eligibleCount = await page.getByTestId("eligible-wallets-count").innerText();
    expect(Number(eligibleCount)).toBeGreaterThan(0);
    await expect(page.getByTestId("estimated-total-cost")).toContainText("ASSUMED");

    // Propose batch
    await page.getByTestId("propose-batch-btn").click();
    await expect(page.getByTestId("propose-success-msg")).toBeVisible();
  });

  test("self-approval protection: proposer cannot approve their own batch", async ({ page }) => {
    await page.goto("/#/batches");

    // Sign in as Analyst who proposed BATCH-8910
    await page.getByTestId("open-login-btn").click();
    await page.getByTestId("login-role-analyst").click();
    await page.getByTestId("login-submit-btn").click();

    // Verify self-approval notice on BATCH-8910
    const selfNotice = page.getByTestId("self-approval-notice-BATCH-8910");
    await expect(selfNotice).toBeVisible();
    await expect(selfNotice).toContainText("Another approver must decide");
  });

  test("approver flow: can approve batch with mandatory decision note", async ({ page }) => {
    await page.goto("/#/batches");

    // Sign in as Approver
    await page.getByTestId("open-login-btn").click();
    await page.getByTestId("login-role-approver").click();
    await page.getByTestId("login-submit-btn").click();

    // Verify Approver session
    await expect(page.getByTestId("profile-avatar-btn")).toBeVisible();

    // Approve button should be visible for BATCH-8910 (proposed by analyst)
    const approveBtn = page.getByTestId("approve-btn-BATCH-8910");
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Decision Modal
    await expect(page.getByTestId("decision-modal")).toBeVisible();
    await page.getByTestId("decision-note-input").fill("Authorized for immediate campaign dispatch.");
    await page.getByTestId("confirm-decision-btn").click();

    // Verify batch status changed to APPROVED
    await expect(page.getByTestId("batch-row-BATCH-8910")).toContainText("APPROVED");
  });

  test("campaign JSON download triggers for approved batches", async ({ page }) => {
    await page.goto("/#/batches");

    // BATCH-8909 is approved in sample data
    const downloadBtn = page.getByTestId("download-json-btn-BATCH-8909");
    await expect(downloadBtn).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await downloadBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("campaign-BATCH-8909.json");
  });

  test("mobile responsiveness at 375px width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/#/batches");

    await expect(page.getByTestId("batches-view")).toBeVisible();
    await expect(page.getByTestId("propose-batch-card")).toBeVisible();
    await expect(page.getByTestId("batches-list-card")).toBeVisible();
  });
});
