import { test, expect } from "@playwright/test";

test.describe("Queue Page & Triage", () => {
  test.beforeEach(async ({ page }) => {
    // Pin to seed.sample.json: these tests use known sample wallets; real-data.spec.ts covers seed.json.
    await page.route("**/seed.json", (route) => route.fulfill({ status: 404 }));
    await page.goto("/#/");
  });

  test("renders KPI summary cards with counts", async ({ page }) => {
    await expect(page.getByTestId("summary-cards")).toBeVisible();
    await expect(page.getByTestId("kpi-total")).toBeVisible();
    await expect(page.getByTestId("kpi-attributed")).toBeVisible();
    await expect(page.getByTestId("kpi-refused")).toBeVisible();
    await expect(page.getByTestId("kpi-refusal-rate")).toBeVisible();
  });

  test("filtering by refused shows only refused rows", async ({ page }) => {
    const verdictSelect = page.getByTestId("filter-verdict");
    await verdictSelect.selectOption("refused");

    // Wait for filtered table
    const table = page.getByTestId("queue-table");
    await expect(table).toBeVisible();

    // Verify all visible rows have the Refused chip and no Attributed chip
    const chips = table.locator(".chip");
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(chips.nth(i)).toHaveText("Refused");
    }
  });

  test("filtering by attributed shows only attributed rows", async ({ page }) => {
    const verdictSelect = page.getByTestId("filter-verdict");
    await verdictSelect.selectOption("attributed");

    const table = page.getByTestId("queue-table");
    await expect(table).toBeVisible();

    const chips = table.locator(".chip");
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(chips.nth(i)).toHaveText("Attributed");
    }
  });

  test("clicking a row navigates to the wallet detail view", async ({ page }) => {
    const firstRow = page.getByTestId("queue-table").locator("tbody tr").first();
    const walletId = await firstRow.locator("td").first().textContent();
    expect(walletId).toBeTruthy();

    await firstRow.click();
    await expect(page).toHaveURL(new RegExp(`#/w/${walletId?.trim()}`));
    await expect(page.getByTestId("wallet-view")).toBeVisible();
    await expect(page.getByTestId("back-button")).toBeVisible();
  });

  test("quick wallet lookup form validation & submit", async ({ page }) => {
    const input = page.getByTestId("wallet-lookup-input");
    const submitBtn = page.getByTestId("wallet-lookup-btn");

    // Empty input: button is disabled
    await expect(submitBtn).toBeDisabled();

    // Invalid format input
    await input.fill("INVALID");
    await submitBtn.click();
    await expect(page.getByRole("alert")).toContainText("must follow format W-XXXXXX");

    // Valid format input from sample
    await input.fill("W-7K9A1B");
    await submitBtn.click();
    await expect(page.getByTestId("lookup-success-msg")).toBeVisible();
  });

  test("clears search input using inline cross button", async ({ page }) => {
    const searchInput = page.getByTestId("search-input");
    await searchInput.fill("Garment");

    const clearBtn = page.getByTestId("clear-search-btn");
    await expect(clearBtn).toBeVisible();

    await clearBtn.click();
    await expect(searchInput).toHaveValue("");
    await expect(clearBtn).not.toBeVisible();
  });

  test("toggles light and dark mode in navbar with light mode as default", async ({ page }) => {
    const themeRoot = page.locator(".theme-root");
    await expect(themeRoot).toHaveAttribute("data-mode", "light");

    const modeToggle = page.getByTestId("mode-toggle");
    await expect(modeToggle).toBeVisible();

    // Click to switch to dark mode
    await modeToggle.click();
    await expect(themeRoot).toHaveAttribute("data-mode", "dark");

    // Click again to switch back to light mode
    await modeToggle.click();
    await expect(themeRoot).toHaveAttribute("data-mode", "light");
  });

  test("displays empty state when search matches nothing and resets filters", async ({ page }) => {
    const searchInput = page.getByTestId("search-input");
    await searchInput.fill("NONEXISTENT_WALLET_ID_XYZ");

    await expect(page.getByTestId("queue-empty-state")).toBeVisible();
    await page.getByTestId("empty-reset-btn").click();

    await expect(page.getByTestId("queue-table")).toBeVisible();
  });
});
