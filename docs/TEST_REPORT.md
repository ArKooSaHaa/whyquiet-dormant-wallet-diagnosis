# End-to-end test report (2026-10-04)

Tested on `main` at `d75d445`, re-checked after Arko's `599818d`, and again on `main` at `da9e2e9` (PR #8 merged) on 2026-10-04. Owners follow the directory split in
[plans/README.md](plans/README.md): **Shads** = `web/**`, **Hrittika** = data/model, **Arko** = `src/rules`,
`src/api`, `api/`, `supabase/`, `README.md`, `Makefile`, `vercel.json`, deploy.

Status key: **OPEN**, **PARTLY FIXED**, **FIXED** (merged to `main` unless noted).

## 1. What passed

| Check | Result |
| --- | --- |
| `ruff check` | passed |
| `pyright` | 0 errors |
| `pytest -q` | 88 passed on `d75d445` (about 2 min); API/rules/health tests 51 passed on `599818d`; **105 passed** on `da9e2e9` |
| OpenAPI and `schema.d.ts` in sync | no drift (also after `599818d`) |
| `tsc -b`, `oxlint`, `vite build` | passed (bundle still over the 500 kB warning on `da9e2e9`) |
| Playwright e2e | 27 / 27 passed; on `da9e2e9` **27 / 30**: 3 fail locally when a dev API with real Supabase keys is already running (see #21) |
| `seed.json` integrity (400 wallets, 100 refused, IDs, posteriors sum to 1, numbers match README) | passed |
| **Live site** (`scripts/verify_deploy.py`) | FAIL on the old site; **PASS** on https://whyquiet.vercel.app (D37) |

`make` is not installed on Windows, so each `make check` step was run by hand.

## 2. Bugs (most serious first)

| # | Owner | Status | Problem | Example / proof | Fix |
| --- | --- | --- | --- | --- | --- |
| 1 | **Arko** (Task 5, deploy) | **FIXED** (Hrittika, D37: fresh deploy at https://whyquiet.vercel.app, `verify_deploy.py` PASS) | The live Vercel site is still the hour-0 placeholder. | Home page says "Operator console placeholder". `/seed.json`, `/seed.sample.json`, `/api/batches` all return 404. Live API has only `/api/health`, `/profile`, `/triage`, `/explain`, `/refuse`. | Redeploy from `main` (`vercel --prod` or fix the Git integration), set Supabase env vars on Vercel, then run `uv run python scripts/verify_deploy.py <URL>` until it prints PASS. The Vercel project is not under Hrittika's account. |
| 1b | **Arko** (Tasks 3 and 5) | **FIXED** (Hrittika, D37: new Supabase project with both migrations and demo accounts; 11/11 write-path checks pass) | The batches migration was never applied to Supabase, and the demo accounts were never created. Only the first migration (`triage_audit_log`) exists. STATE.md and README say both were done. | With real keys in `.env`: `GET /api/batches` returns **500** "Could not find the table 'public.batch_summaries'". `remedy_batches`, `batch_wallets`, `audit_log`, `batch_summaries` are all missing; no `@whyquiet.demo` users exist. The UI hides the 500 and shows "write path offline" with sample batches. | Apply `supabase/migrations/20261003215000_remedy_batches.sql` (`npx supabase login`, `npx supabase link --project-ref tbvbvvyykozmpbcyrbqw`, `npx supabase db push`), then run `supabase/seed_demo_users.py` with the demo passwords set. |
| 2 | **Shads** (Task 4) | **FIXED** (Hrittika, PR #8, D41/D42: `handleLoginSubmit` calls `login()`, keeps token, user_id and server role; wrong password shows the API error) | Sign-in is fake. `handleLoginSubmit` in `web/src/App.tsx` never calls `login()` from `api.ts`. It waits 400 ms and saves the role button you clicked. | Signed in as approver with password `••••••••`. Network log shows no request to `/api/auth/login`. No token is stored, so every write call gets 401. | Call `login(email, password)` from `api.ts`, use the role the server returns, show the error `detail` on failure. Remove the role buttons (or keep them only to prefill the email). |
| 3 | **Shads** (Task 4) | OPEN (re-checked on `da9e2e9`: the three `catch {}` are still in `web/src/Batches.tsx` lines 168, 210, 237) | The Batches page hides every API failure and pretends it worked. `proposeBatch`, `decideBatch` and `exportBatch` are each wrapped in `catch {}` that builds a fake local result (`web/src/Batches.tsx`). | "Batch BATCH-4821 successfully proposed!" appears even though the API returned 401. Real errors (409 wallet already in open batch, 403 self-approval, 403 wrong role) never reach the screen. | Only fall back when the API says 503 (write path offline). For any other error, show `err.message`. |
| 4 | **Shads** | OPEN (re-checked: `Batches.tsx:246` still uses `matchingWallets`) | Exported campaign file can contain the wrong wallets. The export fallback fills `wallet_ids` from `matchingWallets`, which is the cause in the dropdown, not the batch's cause. | Select "Fee Shock" in the dropdown, then download an approved Job Exit batch: the file lists Fee Shock wallets. | Remove the fallback or filter by `batch.cause`. |
| 5 | **Shads** | **FIXED** (Hrittika, PR #8, D41: compares `user.user_id === b.proposed_by`) | Self-approval guard never fires on real batches. UI compares `user.email === b.proposed_by`, but the API returns `proposed_by` as a user UUID. | Works only on the hard-coded sample batches. | Store `user_id` from the login response (fix #2 first) and compare `user.user_id === b.proposed_by`. |
| 6 | **Shads** | **FIXED** (Hrittika, PR #8, D41: samples only when offline (503), real remedy codes, empty real list shows the empty state) | Fake sample batches are shown as if real. When the API works but has no batches, the page shows `SAMPLE_BATCHES` (`BATCH-8910`, `BATCH-8909`). | Their IDs are not UUIDs (API returns 422 on approve), and remedy codes like `REM-JOB-01` fail the DB check `^[a-z][a-z0-9_]{1,63}$`. | Show an empty state when the list is empty. Use sample batches only in offline (503) mode, labelled as sample. |
| 7 | **Arko** (`Makefile`) | **FIXED** (Hrittika, D36) | `make dev` started the API on port 8000, but Vite forwards `/api` to 8008 (`web/vite.config.ts`), so every local API call failed. | With `make dev`, the header showed "API down". | Makefile, README and the 5 context files now use port 8008. Verified: `localhost:5173/api/health` returns ok through the proxy. |
| 8 | **Shads** (Task 3) | **FIXED** (Hrittika, PR #8: axis shows `৳Nk`) | Money chart Y axis shows "৳0.0M" on every tick (`web/src/Evidence.tsx:403` divides by 1,000,000; values are in thousands). Already listed in STATE.md blockers. | Screenshot of Evidence page: all four ticks read ৳0.0M. | Use `formatBDT(val)` or divide by 1000 and show `k`. |
| 9 | **Shads** | **FIXED** (Hrittika, D43, branch `fix/web-round-recovered-users`, not yet merged: `Math.round` for display, e2e checks a whole number) | Table shows fractional people, e.g. "84.41" recovered users. | Evidence money table, 4% row. | Round for display (`Math.round`) or show one decimal with "expected" in the header. |
| 10 | **Arko** (Task 6) | **FIXED** (Hrittika, D40: stubs removed) | The old stub endpoints contradict the product and break the project rule "every endpoint needs validation, auth and tests". `/api/triage`, `/profile`, `/explain`, `/refuse` return the same hard-coded answer for any input. `/triage` writes to the Supabase audit table with no auth. `599818d` ("harden API") did not touch them. | `POST /api/triage {"wallet_id":"anything at all"}` returns "attributed: job_exit" at 0.30 confidence, which the model's own 0.80 bar would refuse. The frontend does not use them. | Hide them with `include_in_schema=False` and stop `/triage` writing to the audit log, or remove them (ask the team first, since the rules say not to delete files). |
| 11 | **Arko** (`src/api/auth.py`, new in `599818d`) | **FIXED** (Hrittika, D40: one 503 handler, tests added) | The new `except Exception` in `current_user` turns a Supabase outage into **401 "Invalid or expired token"**. The contract (`docs/contracts/api.md`) says Supabase down = 503. | If Supabase is paused (free tier pauses after 7 days), a signed-in user is told their token is bad instead of seeing the "write path offline" banner. | Catch only `AuthApiError` as 401; let other errors become 503 (`HTTPException(503, "Write path offline")`). |

## 3. Missing or out of date

| # | Owner | Status | What | Fix |
| --- | --- | --- | --- | --- |
| 12 | **Arko** | **FIXED** (Hrittika, D36) | `.env` was never loaded; nothing read the file. | `uv run --env-file .env ...` (built into uv, no new dependency, not loaded during `pytest`). `.env.example` now says where each value comes from. A local `.env` exists with `SUPABASE_URL` filled; **keys and demo passwords still need to be pasted in** (Supabase dashboard > Project Settings > API, passwords from team chat). |
| 13 | **Shads** (Task 4/5) | **PARTLY FIXED** (PR #8: login is mocked with `page.route` and the 401 wrong-password message is tested; 403 and 409 on propose/approve are still untested, and the propose test passes only because of #3) | No test covers the real write path. The e2e batch tests only exercise the fake fallback, so they pass even though login is fake. | Add an e2e that mocks `/api/*` with `page.route` (as the plan asked) and checks login calls the API and 401/403/409 errors are shown. |
| 14 | **Shads + Arko** (Task 5) | OPEN | Nobody has run the full flow on prod: analyst proposes, approver approves, download. | #1 and #2 are fixed; do it after #3. (Prod `/api/batches` already holds one real `job_exit` batch.) |
| 15 | **Shads** (Task 6) | OPEN | `docs/demo-script.md` does not exist. | Write it (3 minutes, wallet IDs picked, honesty lines verbatim). |
| 16 | **Arko** (`README.md`) | **FIXED** (D36, D37) | README said the API runs on ":8008 / :8000" (fixed) and says the Vercel deploy is live (still wrong until #1). | Update after redeploy. |
| 17 | **All** (`docs/STATE.md`) | **FIXED** (D37: STATE points at the new deploy) | STATE.md says "Vercel production active" and ticks "Deployed demo URL that works offline". Not true right now. | Untick until #1 is fixed. |
| 18 | **Hrittika** | **FIXED** (Hrittika, D44, not yet merged: `git rm --cached`, files kept on disk, `docs/superpowers/` and `.superpowers/` in `.gitignore`) | `docs/superpowers/` (datagen spec and plan) is committed to git, against our rule to keep those docs local. | `git rm --cached -r docs/superpowers` and add it to `.gitignore`. |
| 18b | **Shads** | OPEN (re-checked: `Queue.tsx:123` still calls `/api/triage`) | Queue quick lookup still calls `/api/triage`, which no longer exists (D40), so each lookup makes one 404 request before falling back to `seed.json`. Unknown IDs show "No anomalous lockups detected", which the model never said. | Delete the `fetch("/api/triage")` block in `web/src/Queue.tsx`; for an ID not in the seed, show "not in this sample". |
| 19 | **Shads** (minor) | OPEN | JS bundle is 714 kB (Vite warns above 500 kB). | Optional: lazy-load the Evidence page (Recharts) with `import()`. |
| 20 | **Team decision** (Arko owns `money.py`) | OPEN | Not a code bug: at the base 4% recovery rate the model earns less than the simple rule (৳4,560 vs ৳9,300). It wins only at 8%. README states this honestly, but judges will ask. | Agree on the answer for the demo script. |
| 21 | **Shads** (`web/e2e/batches.spec.ts`; tests added by Hrittika in D41) | OPEN (new on `da9e2e9`) | Three batch e2e tests (self-approval, approver flow, JSON download) depend on the write path being offline. `playwright.config.ts` reuses any API already on port 8008, so if `uv run --env-file .env uvicorn ...` is running with real keys, real batches load and `BATCH-8909` / `BATCH-8910` never appear. CI passes because it has no `.env`. | Local run with the dev API up: 27 / 30, `download-json-btn-BATCH-8909` not found; `localhost:8008/api/health` says `"store":"supabase"`. | In those three tests, mock offline first: `page.route("**/api/batches", r => r.fulfill({ status: 503, json: { detail: "Write path offline" } }))`. Workaround now: stop the dev API before `npx playwright test`. |

## 6. How to test by hand (Windows, no `make`)

### Automated checks
```bash
uv run ruff check src tests datagen scripts api
uv run pyright
uv run pytest -q
cd web && npx tsc -b --noEmit && npx oxlint src e2e && npx vite build && npx playwright test
```

### Run the app (two terminals, API on port 8008)
```bash
uv run --env-file .env uvicorn src.api.main:app --port 8008
cd web && npm run dev
```
Open http://localhost:5173. With blank keys in `.env` the header shows "API ok" and Batches shows the "write path offline" banner; that is expected.

### Read screens (no login needed)
- **Queue:** header badge says "API ok", no yellow "Sample data mode" banner, 400 wallets (100 refused). Search and filters work; searching nonsense shows an empty state.
- **Wallet:** click a row. The 26-week chart shades the silent weeks. Attributed wallets show the remedy in English and Bengali. Refused wallets show the reasons. Try `#/w/W-ZZZZZZ` for the not-found state.
- **Evidence:** headline macro-F1 86.4% with rule baseline 8.2% and shuffled control 16.2% beside it. Fairness table present. The 1% / 4% / 8% toggle changes the money table.
- **Both:** toggle dark mode, and narrow the window to phone width.

### Write path (through the API until #3 is fixed; #2 is fixed)
1. Paste `SUPABASE_SERVICE_ROLE_KEY` into `.env`, restart the API.
2. Open http://localhost:8008/api/docs and run, in order:
   - `POST /api/auth/login` as analyst → copy the token.
   - `POST /api/batches` with the token → 200.
   - Same request again → **409** (wallet already in an open batch).
   - Log in as approver, approve the batch → 200.
   - Approve with the analyst token → **403**.
   - `GET /api/batches/{id}/export` → the wallets you proposed.

### Live site
```bash
uv run python scripts/verify_deploy.py https://whyquiet.vercel.app
```
Prints `PASS` (checked 2026-10-04).
