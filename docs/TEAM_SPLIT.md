# WhyQuiet — Team Split (3 people, parallel, contract-first)

> **Superseded by [docs/plans/README.md](plans/README.md) (D17, 8-hour window). Teammate C = Arko.** Kept for history.

> Status: PROPOSAL (D16). Based on the P1/P2/P3 plan in `docs/PROJECT.md` and `docs/system-design.md`.
> The only handoffs between people are **two frozen contracts** (§2). Everything else is owned by one person.

## 1. Ownership

| Person | Role | Owns (directories) | Done when |
| --- | --- | --- | --- |
| **Hrittika** | Data, model & accuracy | `datagen/`, `src/model/`, `truth/`, `data/`, `tests/model*`, `scripts/train*`, `scripts/eval*` | Seed bundle published; B-population report (macro-F1, gap, refusal rate, calibration, shuffled-label, best-single-feature, rule baseline) green; fairness slices computed |
| **Shads** | Entire frontend | `web/` (all of it), `e2e/`, `src/api/schema.d.ts` consumption, demo script, UI copy | Queue, Wallet Detail, Refusal screen, Money & Evidence, Propose/Approve flows, login, campaign download all work against the contract |
| **Teammate C (name TBD)** | Rules, API, DB, deploy, docs | `src/rules/`, `src/api/`, `api/`, `supabase/`, `Makefile`, CI, `README.md`, report, consent block, Vercel/Supabase | Rule baseline + money calc, all endpoints with auth/validation/tests, migration applied, deploy live, README/report complete |

Shads is the only frontend owner. If Shads gets pulled onto other work, the frontend is built against fixtures (§3), so it can pause without blocking anyone.

## 2. Frozen contracts (do first, ~1 hour, then never change without telling the others)

1. **Seed bundle contract** (Hrittika → Teammate C → Shads)
   - A small JSON schema file, `docs/contracts/seed-bundle.md`, listing per-wallet fields: `wallet_id (W-XXXXXX)`, `verdict`, `posterior[5]`, `top_contributions[]`, `refusal_reasons[]`, `rule_baseline`, `monthly_txn_series[]`, and report tables (money sweep inputs, ML rigor panel, fairness slices).
   - Hrittika writes **to** this shape. Teammate C and Shads read **from** it.
2. **API contract** (Teammate C → Shads)
   - OpenAPI from FastAPI (`make gen-types` → `web/src/api/schema.d.ts`). Teammate C commits endpoint **stubs with Pydantic models first** (hour 0–2), implementations later. Shads types against the generated schema.

Contract changes: one PR touching only the contract file, tagged in chat. Nobody merges silently.

## 3. How each person unblocks themselves

| Person | Needs from others | Works against until it arrives |
| --- | --- | --- |
| Shads | Real seed data and live API | A hand-made `web/src/fixtures/seed.sample.json` (20 wallets: attributed, refused, each cause) matching contract 1; API calls behind one fetch module with a fixture switch |
| Hrittika | Nothing | Her own generator output; writes `truth/` and `data/train/labels.parquet` per A2 |
| Teammate C | Real model output | Same 20-wallet fixture; rule baseline and money math need only the generator's synthetic ledger (can use a tiny stub ledger first) |

## 4. Timeline (maps to PROJECT.md hours)

| Hours | Hrittika | Shads | Teammate C |
| --- | --- | --- | --- |
| 0–2 | Cause fingerprints; draft seed-bundle contract | Review contract; build `seed.sample.json`; app shell, routing, design tokens | API stubs + Pydantic models; OpenAPI → types; push to main |
| 2–6 | Generator complete (pop A and B, traps, `truth/`); hour-6 gate | Queue + Wallet Detail on fixtures | Rule baseline; money calculator (1/4/8% sweep) |
| 6–12 | Features + 5-family LightGBM, calibration, SHAP contributions | Charts (decline shape, posterior, contributions) | Real endpoints reading seed bundle; Supabase migration (from `database-schema.md`) |
| **12** | **Kill-switch test on population B** | | |
| 12–20 | Refusal gate (tau/delta), multi-seed runs, **publish seed bundle** | Refusal screen, Money & Evidence page; swap fixture → live API | Auth + propose/approve/reject, two-person rule, audit log, campaign export |
| 20–24 | Freeze v1, report tables | Login, propose/approve UI, message preview (Bangla + English), e2e | README, deploy, report draft, consent block |
| 24+ (Tier 1) | Fairness depth, adversarial cases | Polish, demo video | Hardening, docs |

## 5. Rules of the road

- One branch per feature; Shads touches only `web/`, Hrittika only her directories, Teammate C everything else. Cross-boundary change = ask the owner.
- `src/model` never imports `truth/` (CI test, owned by Hrittika).
- Business rules stay in `src/rules`, never in the model package.
- Every decision goes into `docs/DECISIONS.md`.

## 6. Open questions

- Teammate C's name and any preferences/skills (if they are stronger in frontend or ML, swap the tail items).
- Window: 24 vs 48 hours (STATE.md blocker) — Tier 0 is identical either way.
