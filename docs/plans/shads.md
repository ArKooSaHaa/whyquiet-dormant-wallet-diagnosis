# Shads — Entire frontend (`web/`)

> Read [README.md](README.md) (team rules), [seed-bundle.md](../contracts/seed-bundle.md) and
> [api.md](../contracts/api.md) first.
> You own `web/**` only. You never wait on anyone: read screens use `seed.sample.json` until
> Hrittika's `seed.json` lands (~H5); write screens use Arko's stubs (~H1) until the real API (~H5).
> If you get pulled onto other work, the frontend can pause. Nobody is blocked by you until H6.

## Rules you must not break
- Stack: Vite + React 19 + TS + Tailwind v4 + Recharts (all installed). **No new deps**: no router lib (use `location.hash`), no state lib, no supabase-js (login goes through `/api/auth/login`), no UI kit.
- Types: seed types hand-written once in `web/src/seed.ts` from the contract; API types from the generated `web/src/api/schema.d.ts`.
- Every interactive element has a unique `id` / `data-testid` (e2e + browser testing).
- Money values always show the **ASSUMED** label. Headline accuracy = **B**, always next to rule baseline + shuffled control.
- Refusal is a first-class screen, never an error state.
- No PII anywhere: only `W-XXXXXX`.

## Prompt prefix (paste at the top of every task prompt)
```
You are working in the WhyQuiet repo, web/ only. Read AGENTS.md, docs/plans/shads.md,
docs/contracts/seed-bundle.md and docs/contracts/api.md. Use the ponytail skill (full): React 19 +
Tailwind + Recharts already installed, no new dependencies, hash routing via location.hash, plain fetch,
fewest files. Use superpowers:test-driven-development for logic (formatters, refusal-reason rendering,
seed loading fallback) and a Playwright e2e for each screen. If anything breaks, use
superpowers:systematic-debugging. Before claiming done, use superpowers:verification-before-completion
and show the output of: cd web && npx tsc -b --noEmit && npx oxlint src e2e && npx vite build
For visual work also use the frontend-design (or impeccable) skill: dense, calm operator-console look,
dark, one accent colour, tabular numbers.
```

---

### Task 0 — Sample seed (H0–0.5)
**Files:** `web/public/seed.sample.json`, `web/src/seed.ts`
- 20 wallets that cover: each of the 5 causes attributed, ≥ 5 refused (one with a near-uniform posterior, one with a 2-cause tie), mixed worker types/pay cycles, 26-week series with visibly different shapes.
- Plausible `report` (mark `meta.model_version: "sample"`), `remedies` for all 5 causes with Bangla + English messages, `money` with 9 rows.
- `seed.ts`: the TS types from the contract + `loadSeed(): Promise<SeedBundle>`, which fetches `/seed.json` and falls back to `/seed.sample.json`.

**Prompt:**
```
<prefix>
Task 0: Create web/public/seed.sample.json, a realistic hand-made 20-wallet bundle exactly matching
docs/contracts/seed-bundle.md (coverage listed in Task 0 of docs/plans/shads.md), and web/src/seed.ts
with the contract's TS types and loadSeed() (fetch /seed.json, fall back to /seed.sample.json, cache the
promise in a module variable). Show a banner "Sample data" when the fallback is used.
```

### Task 1 — Shell + Triage Queue (H0.5–1.5)
**Files:** `web/src/App.tsx`, `web/src/Queue.tsx`, `web/e2e/queue.spec.ts`
- Header: WhyQuiet · Cause Desk, nav: Queue / Batches / Evidence, login status. Hash routes: `#/`, `#/w/W-XXXXXX`, `#/batches`, `#/evidence`.
- Honesty line from `meta.honesty_line` in a footer strip on every page.
- Queue table: wallet ID, worker type, pay cycle, weeks silent, verdict chip (attributed = accent, refused = neutral grey, never red), top cause, confidence, rule baseline. Filter by verdict + cause (native `<select>`), sort by confidence. Row click → wallet detail.
- Summary cards on top: count attributed / refused / refusal rate.

**Prompt:**
```
<prefix>
Task 1: Replace web/src/App.tsx with a hash-routed shell (#/, #/w/:id, #/batches, #/evidence) and build
web/src/Queue.tsx per Task 1 of docs/plans/shads.md using loadSeed(). Keep the existing api-badge
testid working (e2e/smoke.spec.ts). Add e2e/queue.spec.ts: filter to refused shows only refused rows;
clicking a row navigates to the wallet.
```

### Task 2 — Wallet Detail + Refusal screen (H1.5–3)
**Files:** `web/src/Wallet.tsx`, `web/e2e/wallet.spec.ts`
- Decline-shape chart (Recharts line/area of `txn_count` per week, with the silence window shaded).
- Posterior bar chart over 5 causes, with τ as a reference line.
- Top contributions as horizontal bars (feature name, value, signed contribution).
- "What the rule would do": `rule_baseline.action` vs the model verdict, side by side.
- **Attributed:** remedy card from `remedies[cause]`: label, unit cost (ASSUMED), Bangla + English message preview.
- **Refused (money shot):** large calm panel: **"No attributable cause. I will not spend your money here."** + each `refusal_reasons` line + the contribution list showing nothing discriminates. No action buttons.

**Prompt:**
```
<prefix>
Task 2: Build web/src/Wallet.tsx per Task 2 of docs/plans/shads.md with Recharts (decline shape,
posterior bars with a tau reference line, contribution bars), rule-vs-model comparison, remedy card with
bilingual message for attributed wallets, and the dedicated refusal panel for refused wallets
(exact headline text in the plan, no action buttons). e2e/wallet.spec.ts covers one attributed and one
refused wallet from seed.sample.json.
```

### Task 3 — Money & Evidence page (H3–4)
**Files:** `web/src/Evidence.tsx`, `web/e2e/evidence.spec.ts`
- **ML rigor panel:** headline B macro-F1 (big), beside: rule baseline F1, shuffled-label control, A-test F1 and gap, best single feature + its F1, refusal A vs B, ECE. One-line explanation under each.
- Confusion matrix on B (plain table with background intensity).
- Fairness table: slice, group, n, macro-F1, refusal rate.
- **Money:** recovery-rate toggle 1% / 4% / 8% (default 4%), grouped bars rule vs model vs oracle on `value_bdt`, table below. **ASSUMED** badge + `report.assumptions` list. If `money` is null, show "Money model pending".

**Prompt:**
```
<prefix>
Task 3: Build web/src/Evidence.tsx per Task 3 of docs/plans/shads.md: ML rigor panel (B headline next to
rule baseline and shuffled control), confusion matrix table, fairness table, and the money section with a
1/4/8% segmented toggle, Recharts grouped bars rule/model/oracle, ASSUMED badge and assumptions list;
handle money === null. Format BDT with Intl.NumberFormat('en-BD'). e2e/evidence.spec.ts toggles the
rate and checks values change.
```

### Task 4 — Login + Batches (propose / approve / export) (H4–5.5)
**Files:** `web/src/api.ts`, `web/src/Batches.tsx`, `web/e2e/batches.spec.ts`
- `api.ts`: `login(email, pw)`, `listBatches()`, `propose(cause, walletIds)`, `decide(id, "approve"|"reject", note)`, `exportBatch(id)`; token kept in `sessionStorage`; on error show `detail`.
- Login: small form in a native `<dialog>`; header shows email + role; logout clears storage.
- Propose (analyst): pick a cause → shows remedy, wallet count (attributed wallets of that cause from seed), total cost (ASSUMED), bilingual message preview → "Propose batch".
- Batches list: status chip, proposer, cost. Approver sees Approve / Reject with a required note; buttons hidden for own batches ("You proposed this. Another approver must decide.").
- Approved → "Download campaign JSON" (Blob + `<a download>`).
- 503 from API → banner "Write path offline. Read-only screens still work." (cutline 2: if Arko's API is cut, this page shows the propose preview only.)

**Prompt:**
```
<prefix>
Task 4: Build web/src/api.ts (typed with web/src/api/schema.d.ts, plain fetch, Bearer token in
sessionStorage) and web/src/Batches.tsx per Task 4 of docs/plans/shads.md: login via native <dialog>,
analyst propose flow with remedy + count + cost + bilingual preview, approver approve/reject with
required note, self-approval hidden with explanation, JSON download for approved batches, 503 offline
banner. e2e/batches.spec.ts mocks /api/* with page.route.
```

### Task 5 — Integrate real data (H5–6.5)
- When Hrittika posts "seed.json is live": `git pull`, open every screen, fix anything that breaks on real data (long feature names, 400 rows, null money).
- When Arko posts "deployed": test the full flow on prod with both demo accounts: analyst proposes → approver approves → download.
- Run `cd web && npx playwright test` and `make check`.

### Task 6 — Polish + demo script (H6.5–7.5)
- Run the `impeccable` or `design-review` skill on each screen once; fix only the top 3 issues per screen.
- Write `docs/demo-script.md` (3 minutes): the one sentence → queue → an attributed wallet (decline shape + contributions + remedy) → **the refused wallet** ("I will not spend your money here") → evidence (B headline vs rule vs shuffled) → money sweep at 1/4/8% → propose + approve with two accounts → download. Include the A1/A3 honesty sentences verbatim and the two hard-question answers from `docs/PROJECT.md`.
- Pick the exact wallet IDs to show and put them in the script.

## Done checklist
- [ ] All 4 pages work on prod from `seed.json`, offline (kill the API: read screens still work)
- [ ] Refusal screen shows the exact headline + reasons
- [ ] Evidence page: B headline + rule + shuffled + ASSUMED money sweep
- [ ] Two-account propose → approve → download works on prod
- [ ] `tsc`, `oxlint`, `vite build`, Playwright green
- [ ] `docs/demo-script.md` written, rehearsed once with the team
