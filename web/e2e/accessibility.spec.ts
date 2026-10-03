import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Frontend Accessibility Audits (WCAG 2.1 AA)", () => {
  test.beforeEach(async ({ page }) => {
    // Pin to seed.sample.json and mock auth for clean deterministic audits
    await page.route("**/seed.json", (route) => route.fulfill({ status: 404 }));
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-token",
          token_type: "bearer",
          user_id: "approver@whyquiet.demo",
          email: "approver@whyquiet.demo",
          role: "approver",
        }),
      })
    );
  });

  test("Triage Queue page passes WCAG 2.1 AA in light & dark modes", async ({ page }) => {
    await page.goto("/#/");
    await expect(page.getByTestId("queue-view")).toBeVisible();

    // 1. Audit Light Mode (default)
    const lightAxeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(lightAxeResults.violations).toEqual([]);

    // 2. Audit Dark Mode
    await page.getByTestId("mode-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    const darkAxeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(darkAxeResults.violations).toEqual([]);
  });

  test("Wallet Detail (Attributed) passes WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/#/w/W-7K9A1B");
    await expect(page.getByTestId("wallet-view")).toBeVisible();
    await expect(page.getByTestId("remedy-card")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Wallet Detail (Refused) passes WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/#/w/W-6B8C1D");
    await expect(page.getByTestId("wallet-view")).toBeVisible();
    await expect(page.getByTestId("refusal-panel")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Batches & Governance page passes WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/#/batches");
    await expect(page.getByTestId("batches-view")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Evidence & ML Rigor page passes WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/#/evidence");
    await expect(page.getByTestId("evidence-view")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Sign In Modal passes WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/#/");
    await page.getByTestId("open-login-btn").click();
    await expect(page.getByTestId("login-modal")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Decision Modal passes WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/#/batches");
    // Sign in as approver to trigger decision modal
    await page.getByTestId("open-login-btn").click();
    await page.getByTestId("login-role-approver").click();
    await page.getByTestId("login-submit-btn").click();
    await expect(page.getByTestId("login-modal")).not.toBeVisible();

    // Click Approve on first proposed batch
    const approveBtn = page.locator("[data-testid^='approve-btn-']").first();
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();
    await expect(page.getByTestId("decision-modal")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
