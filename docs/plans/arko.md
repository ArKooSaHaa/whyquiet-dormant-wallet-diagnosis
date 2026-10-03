# Arko — Rules, API, database, deploy & docs

> Read [README.md](README.md) (team rules), [seed-bundle.md](../contracts/seed-bundle.md) (the `src/rules`
> section) and [api.md](../contracts/api.md) first.
> You own: `src/rules/`, `src/api/`, `api/`, `supabase/`, rules/API tests, `README.md`, `Makefile`, `vercel.json`, CI.
> Two hard deadlines: **rules pushed by H2** (Hrittika's export imports them), **API stubs pushed by H1** (Shads types against them).

## Rules you must not break
- Business rules are deterministic Python in `src/rules`. No ML, no LLM there.
- Every endpoint: Pydantic validation, auth check, authorization check, tests (AGENTS.md).
- Every DB change is a migration file in `supabase/migrations/`. Never edit the DB by hand.
- Secrets only in env vars; document names in `.env.example`. Service-role key never reaches the browser.
- Every taka/rate input is labelled **ASSUMED** (no source exists in the repo).
- No new dependencies: `supabase`, `fastapi`, `pydantic` are already installed.

## Prompt prefix (paste at the top of every task prompt)
```
You are working in the WhyQuiet repo. Read AGENTS.md, docs/plans/arko.md, docs/contracts/api.md and
docs/contracts/seed-bundle.md. Use the ponytail skill (full): stdlib and already-installed deps
(fastapi, pydantic v2, supabase) only, no new dependencies, no speculative abstractions, DB constraints
over app code. Use superpowers:test-driven-development (failing test first). If anything fails, use
superpowers:systematic-debugging. Before claiming done, use superpowers:verification-before-completion
and show the output of: uv run ruff check src tests datagen scripts api && uv run pyright && uv run pytest -q
Only edit: src/rules/, src/api/, api/, supabase/, tests/test_rules*.py, tests/test_api*.py, README.md,
Makefile, vercel.json, .env.example, .github/.
```

---

### Task 1 — API stubs for the write path (H0–1) ⏱ unblocks Shads

**Files:** `src/api/schemas.py`, `src/api/main.py`, `tests/test_api_batches.py`, then `make gen-types`
- Add Pydantic models + endpoints from `api.md` returning **hard-coded example objects** (`stub=True` not needed; just correct shapes).
- Run `make gen-types` so `web/src/api/openapi.json` + `schema.d.ts` update. Commit those two generated files too (they're the contract; tell Shads).
- Leave the existing `/api/triage|explain|refuse|profile` alone (see Task 6).

**Prompt:**
```
<prefix>
Task 1: Add the write-path endpoints from docs/contracts/api.md to src/api/main.py with Pydantic v2
models in src/api/schemas.py, returning hard-coded example objects of the exact response shapes
(auth not enforced yet). Validate inputs: cause in the 5 CauseFamily values, wallet_ids match
^W-[0-9A-Z]{6}$ with 1..1000 items, note 1..500 chars. Tests with fastapi TestClient for 200 and 422.
Then run `make gen-types` (or the two commands inside it) and commit the generated files.
```

### Task 2 — Deterministic rules (H1–2) ⏱ unblocks Hrittika

**Files:** `src/rules/baseline.py`, `src/rules/remedies.py`, `src/rules/money.py`, `tests/test_rules.py`
Exact signatures are in `seed-bundle.md`. Content:
- `rule_baseline(weeks_silent)`: fired iff `weeks_silent >= 3` → `"message_everyone"`, else `"none"`.
- `REMEDIES`: one entry per cause. Example direction (all costs ASSUMED): job_exit → "pause, re-engage on new payroll", migration → "location-aware agent referral", solved_problem → `no_action` cost 0 (don't spend money on users who are fine), fee_shock → "fee waiver for next N cash-outs", supply_failure → "flag agent liquidity to field team". `message_en` + `message_bn` (Bangla) per remedy.
- `money_table(n_triaged, n_correct, n_wrong, n_refused)`: for each recovery rate in (0.01, 0.04, 0.08) and strategy:
  - **rule**: everyone triaged gets a generic message; recovers at `rate × GENERIC_FACTOR`.
  - **model**: correct → recovers at `rate`; wrong → `rate × GENERIC_FACTOR`; refused → no spend, no recovery.
  - **oracle**: every triaged wallet gets its true cause's remedy (as if `n_correct = n_triaged`, no refusals).
  - `value_bdt = users_recovered × ARPU_BDT × RAMP − cost_bdt`.
  - Constants `ARPU_BDT`, `RAMP`, `GENERIC_FACTOR`, `MSG_COST_BDT`, remedy costs live at the top of `money.py`, each with an `# ASSUMED` comment, and are listed in `ASSUMPTIONS`.
- Tests: rule fires at 3 not 2; money rows = 9; refused wallets cost 0; oracle ≥ model ≥ … (assert oracle ≥ model).

**Prompt:**
```
<prefix>
Task 2: Implement src/rules/baseline.py, remedies.py and money.py with the exact signatures in
docs/contracts/seed-bundle.md ("src/rules functions the exporter calls") and the behaviour in Task 2 of
docs/plans/arko.md. Pure functions, no I/O. Every numeric constant is marked "# ASSUMED" and listed in
ASSUMPTIONS. Bangla + English message per remedy. tests/test_rules.py first. Push when green and tell
Hrittika the rules are ready.
```

### Task 3 — Migration (H2–2.75)

**Files:** `supabase/migrations/<timestamp>_remedy_batches.sql`
- Take the SQL from `docs/database-schema.md` §2 (D15: `remedy_batches`, `batch_wallets`, `audit_log`, triggers for two-person rule, one-open-batch-per-wallet, append-only audit). Simplify if anything is beyond what api.md needs.
- Keep `unit_cost_paisa bigint` in the DB; convert to BDT only in the API response (`unit_cost_bdt = paisa / 100`).
- Apply with `supabase db push` (or Supabase MCP `apply_migration`). Then append a DECISIONS row if you changed the D15 schema.

**Prompt:**
```
<prefix>
Use the supabase and supabase-postgres-best-practices skills too.
Task 3: Create one migration in supabase/migrations/ from the SQL in docs/database-schema.md §2,
trimmed to exactly what docs/contracts/api.md needs. Keep: two-person rule as a CHECK/trigger,
one open batch per wallet, audit_log append-only (UPDATE/DELETE blocked), RLS enabled (API uses the
service-role key server-side). Apply it to project tbvbvvyykozmpbcyrbqw and show the result.
```

### Task 4 — Real batch endpoints + auth (H2.75–5)

**Files:** `src/api/auth.py` (one small module), `src/api/batches.py` (or inline in `main.py` if short), tests.
- `POST /api/auth/login` → `supabase.auth.sign_in_with_password`, return `access_token`, `user_id`, `role` from `user.app_metadata.role`.
- Dependency `current_user(Authorization header)` → `supabase.auth.get_user(token)` → `(user_id, role)`; 401 if missing/invalid.
- Authorization in the endpoint: propose requires `analyst`; approve/reject require `approver` and `user_id != proposed_by` (403). DB trigger is the backstop.
- `unit_cost` and `remedy_code` come from `src.rules.remedies.REMEDIES[cause]`, never from the client.
- Every state change also inserts an `audit_log` row (actor, role, action, target, metadata).
- If Supabase env vars are missing → 503 with `{"detail": "Write path offline"}` (read screens don't care).
- Tests: monkeypatch the Supabase client; cover 401, 403 wrong role, 403 self-approve, 409 not proposed, 200 happy paths.

**Prompt:**
```
<prefix>
Use the supabase skill too.
Task 4: Replace the batch stubs with real implementations per docs/contracts/api.md using the existing
`supabase` Python client (service-role key, server-side only) and Supabase Auth for login and token
verification (role from app_metadata.role). Remedy code and unit cost come from src.rules.remedies.
Write an audit_log row for every state change. 503 "Write path offline" when env vars are missing.
Tests monkeypatch the client and cover 401/403 (role and self-approval)/404/409/422 and happy paths.
Keep it to one or two files. Update .env.example with variable names only.
```

### Task 5 — Deploy + demo accounts (H5–6)
- In Supabase create `analyst@whyquiet.demo` and `approver@whyquiet.demo`, set `app_metadata.role` (Supabase MCP `create_auth_user` / dashboard). Passwords → team chat only.
- Vercel env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` if login needs it.
- Deploy (`vercel --prod` or push to main), then `make verify-deploy URL=https://whyquiet-dormant-wallet-diagnosis.vercel.app`.
- Confirm `https://…/seed.json` loads and `/api/docs` shows the endpoints. Tell the team.

### Task 6 — Optional, only if ahead (H6)
The old `/api/triage|explain|refuse|profile` stubs show `stub: true` in `/api/docs`. Either make them read
a copy of the seed (`src/api/seed.json`, written by Hrittika's exporter: ask her to add one line), or mark
them `include_in_schema=False`. Pick whichever takes less time.

### Task 7 — README, report, consent block (H6–7.5)
- README sections: what it is, the honesty line (A1/A3 verbatim), live URL, demo accounts (how to get them, not passwords), how to run (`uv sync`, `make dev`), architecture picture from `docs/plans/README.md`, results table (Hrittika sends), money table with **ASSUMED** labels and the 1/4/8% sweep, responsible-AI section (human approval, two-person rule, refusal is terminal, no PII, no messages ever sent), limitations.
- Consent/compliance block: synthetic data only, no real customer data, pseudonymous IDs, no live dispatch.
- Report draft: same content, longer (`docs/report.md`).

**Prompt:**
```
<prefix>
Task 7: Rewrite README.md for judges using docs/system-design.md, docs/PROJECT.md (AMENDMENTS A1/A3
wording is mandatory, verbatim), docs/plans/README.md and the results block Hrittika sent (paste it).
Mark every unsourced number ASSUMED or UNVERIFIED. Add a consent/compliance block. Then write
docs/report.md as the longer version. No invented facts.
```

## Done checklist
- [x] Rules on main by H2; Hrittika confirmed import works
- [x] All endpoints in api.md: validation + authn + authz + tests, `make gen-types` committed
- [x] Migration applied; demo accounts work on prod
- [x] Prod URL: `/seed.json`, `/api/health`, login → propose → approve (other account) → export all work
- [x] README + report + consent block on main
- [x] `make check` green
