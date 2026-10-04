import { test, expect, type Page } from "@playwright/test";

// e2e runs without Supabase, so the real /api/auth/login is mocked. user_id equals the offline
// sample batches' proposed_by ("analyst@whyquiet.demo") so the self-approval rule can be checked.
async function mockLogin(page: Page, userId?: string) {
  await page.route("**/api/auth/login", async (route) => {
    const { email, password } = route.request().postDataJSON();
    if (password !== "demo-pass") {
      return route.fulfill({ status: 401, json: { detail: "Invalid email or password" } });
    }
    const role = email.startsWith("approver") ? "approver" : "analyst";
    await route.fulfill({ json: { access_token: "e2e-token", user_id: userId ?? email, role } });
  });
}

async function signIn(page: Page, role: "analyst" | "approver", password = "demo-pass", userId?: string) {
  await mockLogin(page, userId);
  await page.getByTestId("open-login-btn").click();
  await page.getByTestId(`login-role-${role}`).click();
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit-btn").click();
}

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
    await signIn(page, "analyst");

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
    await page.route("**/api/batches*", (route) =>
      route.fulfill({ status: 503, json: { detail: "Write path offline" } })
    );
    await page.goto("/#/batches");

    // Sign in as Analyst who proposed BATCH-8910
    await signIn(page, "analyst");

    // Verify self-approval notice on BATCH-8910
    const selfNotice = page.getByTestId("self-approval-notice-BATCH-8910");
    await expect(selfNotice).toBeVisible();
    await expect(selfNotice).toContainText("You proposed this");
  });

  test("approver flow: can approve batch with mandatory decision note", async ({ page }) => {
    await page.route("**/api/batches*", (route) =>
      route.fulfill({ status: 503, json: { detail: "Write path offline" } })
    );
    await page.goto("/#/batches");

    // Sign in as Approver
    await signIn(page, "approver");

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
    await page.route("**/api/batches*", (route) =>
      route.fulfill({ status: 503, json: { detail: "Write path offline" } })
    );
    await page.goto("/#/batches");

    // BATCH-8909 is approved in sample data
    const downloadBtn = page.getByTestId("download-json-btn-BATCH-8909");
    await expect(downloadBtn).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await downloadBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("campaign-SAMPLE-BATCH-8909.json");
  });

  test("audit history timeline expands and displays entries", async ({ page }) => {
    const id = "44444444-4444-4444-4444-444444444444";
    await page.route(/\/api\/batches/, async (route) => {
      if (route.request().url().includes("/audit")) {
        return route.fulfill({
          json: [
            {
              id: "audit-1",
              actor_id: "analyst-uuid",
              actor_role: "analyst",
              action: "batch.propose",
              target_id: id,
              metadata: { wallet_count: 50 },
              created_at: new Date().toISOString(),
            },
          ],
        });
      }
      return route.fulfill({
        json: [
          {
            id,
            cause: "fee_shock",
            remedy_code: "fee_shock_waiver",
            unit_cost_bdt: 25,
            wallet_count: 50,
            status: "proposed",
            proposed_by: "analyst-uuid",
            decided_by: null,
            decided_at: null,
            decision_note: null,
            created_at: new Date().toISOString(),
          },
        ],
      });
    });

    await page.goto("/#/batches");
    const historyBtn = page.getByTestId(`history-btn-${id}`);
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    await expect(page.getByTestId(`audit-timeline-${id}`)).toBeVisible();
    await expect(page.getByTestId("audit-entry-batch.propose")).toBeVisible();
  });

  test("session expired on 401 re-opens login modal with notice", async ({ page }) => {
    await page.route(/\/api\/batches/, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 401, json: { detail: "Invalid or expired token" } });
      }
      return route.fulfill({ json: [] });
    });

    await page.goto("/#/batches");
    await signIn(page, "analyst");
    await page.getByTestId("propose-batch-btn").click();

    // Should catch 401, clear stored user, and prompt sign in modal with notice
    await expect(page.getByTestId("login-modal")).toBeVisible();
    await expect(page.getByTestId("login-modal")).toContainText("expired");
  });

  test("mobile responsiveness at 375px width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/#/batches");

    await expect(page.getByTestId("batches-view")).toBeVisible();
    await expect(page.getByTestId("propose-batch-card")).toBeVisible();
    await expect(page.getByTestId("batches-list-card")).toBeVisible();
  });

  test("sign-in calls the API and shows its error on a wrong password", async ({ page }) => {
    await page.goto("/#/batches");
    await signIn(page, "analyst", "wrong");

    await expect(page.getByTestId("login-modal")).toContainText("Invalid email or password");
    await expect(page.getByTestId("profile-avatar-btn")).toHaveCount(0);
  });

  test("real batches: empty list shows no samples; proposer is matched by user id", async ({ page }) => {
    const mine = {
      id: "11111111-1111-4111-8111-111111111111", cause: "job_exit", remedy_code: "job_exit_payroll_reengage",
      unit_cost_bdt: 15, wallet_count: 2, status: "proposed", proposed_by: "aaaaaaaa-0000-4000-8000-000000000001",
      decided_by: null, decided_at: null, decision_note: null, created_at: new Date().toISOString(),
    };
    let rows: object[] = [];
    await page.route(/\/api\/batches/, (route) => route.fulfill({ json: rows }));

    await page.goto("/#/batches");
    await expect(page.getByTestId("batches-empty-state")).toBeVisible();
    await expect(page.getByTestId("batch-row-BATCH-8910")).toHaveCount(0);
    await expect(page.getByTestId("write-path-offline-banner")).toHaveCount(0);

    rows = [mine];
    await page.reload();
    await signIn(page, "analyst", "demo-pass", mine.proposed_by);
    await expect(page.getByTestId(`self-approval-notice-${mine.id}`)).toBeVisible();
  });

  test("real write path: propose sends the token, a repeat gets 409 and the error is shown", async ({ page }) => {
    const auth: (string | undefined)[] = [];
    let posts = 0;
    await page.route(/\/api\/batches/, (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: [] });
      auth.push(route.request().headers()["authorization"]);
      const { cause, wallet_ids } = route.request().postDataJSON();
      if (++posts > 1) return route.fulfill({ status: 409, json: { detail: "A wallet is already in an open batch" } });
      return route.fulfill({ json: {
        id: "22222222-2222-4222-8222-222222222222", cause, remedy_code: "job_exit_payroll_reengage", unit_cost_bdt: 15,
        wallet_count: wallet_ids.length, status: "proposed", proposed_by: "analyst-id", decided_by: null,
        decided_at: null, decision_note: null, created_at: new Date().toISOString(),
      } });
    });

    await page.goto("/#/batches");
    await signIn(page, "analyst");
    await page.getByTestId("propose-batch-btn").click();
    await expect(page.getByTestId("propose-success-msg")).toContainText("22222222-2222-4222-8222-222222222222");

    await page.getByTestId("propose-batch-btn").click();
    await expect(page.getByTestId("propose-error-msg")).toHaveText("A wallet is already in an open batch");
    await expect(page.getByTestId("propose-success-msg")).toHaveCount(0);
    expect(auth).toEqual(["Bearer e2e-token", "Bearer e2e-token"]);
  });

  test("real write path: a 403 on approve is shown and the batch stays proposed", async ({ page }) => {
    const id = "33333333-3333-4333-8333-333333333333";
    await page.route(/\/api\/batches/, (route) => {
      if (route.request().url().includes("/approve")) {
        return route.fulfill({ status: 403, json: { detail: "You cannot decide a batch you proposed" } });
      }
      return route.fulfill({ json: [{
        id, cause: "job_exit", remedy_code: "job_exit_payroll_reengage", unit_cost_bdt: 15, wallet_count: 2,
        status: "proposed", proposed_by: "someone-else", decided_by: null, decided_at: null, decision_note: null,
        created_at: new Date().toISOString(),
      }] });
    });

    await page.goto("/#/batches");
    await signIn(page, "approver");
    await page.getByTestId(`approve-btn-${id}`).click();
    await page.getByTestId("decision-note-input").fill("Looks good.");
    await page.getByTestId("confirm-decision-btn").click();

    await expect(page.getByTestId("decision-modal")).toContainText("You cannot decide a batch you proposed");
    await expect(page.getByTestId(`batch-row-${id}`)).not.toContainText("APPROVED");
  });

  test("persona buttons fill the email and the public demo password", async ({ page }) => {
    await page.goto("/#/batches");
    await page.getByTestId("open-login-btn").click();
    await page.getByTestId("login-role-approver").click();
    await expect(page.getByTestId("login-email")).toHaveValue("approver@whyquiet.demo");
    await expect(page.getByTestId("login-password")).not.toHaveValue("");
  });
});
