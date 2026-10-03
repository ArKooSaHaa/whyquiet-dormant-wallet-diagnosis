# Datagen design: synthetic dormant-wallet populations A and B

Status: approved in brainstorm 2026-10-03 (Hrittika). Implements Task 1 of `docs/plans/hrittika.md`.
Owner: Hrittika. Decision row: D21 in `docs/DECISIONS.md`.

## Purpose

There is no public dataset that labels why a mobile money wallet went dormant. The closest public data are
PaySim (synthetic, 30 days, fraud labels only: https://www.kaggle.com/datasets/ealaxi/paysim1) and small
synthetic churn sets with a churned/not-churned flag and no cause. Real cause information exists only in
surveys, for example the IFC Côte d'Ivoire survey of about 1,000 inactive users
(https://documents1.worldbank.org/curated/en/991761592191000636/pdf/Who-will-Churn-Leveraging-Predictive-Modeling-for-Insights-and-Action-on-DFS-Customer-Inactivity.pdf).

So we simulate. The generator produces wallets whose true dormancy cause is known, so the model in Task 2
can be trained on population A and scored on a shifted population B. This supports the A1 claim only:
attribution survives a population the model never saw, in simulation. It says nothing about real-world
accuracy.

## Decisions

| Topic | Choice | Why |
| --- | --- | --- |
| Data shape | One row per wallet per week, with extra clue columns | Count and amount alone cannot separate fee_shock, supply_failure and migration. Per-transaction rows would cost millions of rows and get re-aggregated to weeks anyway. |
| Generation method | Template per cause: normal payday-driven activity, then a cause-specific decline in the final weeks, plus side clues | Vectorised numpy, runs in seconds, every knob in one dict. An agent-based simulator (PaySim style) would take 4-6 hours (estimate) with nothing to calibrate against. |
| Blended wallets | Labelled with their stronger (primary) cause, `blended=True` in truth only | Keeps the contract at 5 causes. Refusing on these is correct behaviour; a sixth "ambiguous" class would turn refusal into an ordinary guess. |
| Cause mix | Population A anchored to the IFC survey ratios. migration and supply_failure are ASSUMED. | Real churn is uneven. Equal 20% shares have no source. Task 2 uses LightGBM `class_weight="balanced"` so small classes still train. |

## Files

One file: `datagen/generate.py`. CLI: `uv run python -m datagen.generate --seed 42`.

- `PARAMS = {"A": {...}, "B": {...}}` at the top of the file holds every knob in the table below.
- `wallet_ids(n, rng) -> list[str]` draws unique ids once for both populations, so A and B never collide.
- `make_population(params, ids, rng) -> (wallets, weekly, labels)` builds one population.
- `main(seed, out=repo root)` builds A (6000) and B (3000), splits A 80/20 into train and test, and writes the
  files under `out`. The default is the repo root, so the CLI works from any working directory.

Outputs:

```
data/train/wallets.parquet  data/train/weekly.parquet  data/train/labels.parquet   A-train, 4800 wallets
data/a_test/wallets.parquet data/a_test/weekly.parquet                             A-test, 1200 wallets
data/b/wallets.parquet      data/b/weekly.parquet                                  B, 3000 wallets
truth/a_test_labels.parquet truth/b_labels.parquet                                 evaluation only
```

Columns:

- `wallets`: `wallet_id` (`W-` plus 6 chars `[0-9A-Z]`), `worker_type`, `pay_cycle`, `acquired_week`, `fee_week`.
- `weekly`: `wallet_id, week, txn_count, amount_bdt, cashin_count, cashout_ok, cashout_fail, app_share, district_changed`.
  One row for every week from `acquired_week` to week 51, including the silent weeks (zeros).
- `labels` and `truth/*`: `wallet_id, cause, blended`. `data/train/labels.parquet` is the only label file the
  model may read. Task 2 uses `wallet_id, cause` and must ignore `blended`.

`fee_week` is one value per population (a market-wide price change). It is copied onto every wallet row so
features do not need `PARAMS`.

Data files are regenerated from the seed and never committed. Only `web/public/seed.json` is committed (Task 4).

## How one wallet is generated

Weeks are numbered 0 to 51. Observation happens at the end of week 51. Every wallet is dormant at that point:
`weeks_silent` is drawn from 3 to 15, and dormancy starts at week `52 - weeks_silent`. The week before
dormancy always has at least one transaction, so `weeks_silent` is exact. Three silent weeks is
upay's existing dormancy trigger (`docs/PROJECT.md` row 2). For fee_shock wallets the dormancy start is not
drawn independently: it is `fee_week + fee lag + fade`, where fade is 2 to 4 weeks, and `weeks_silent`
follows from that. For job_exit wallets the start snaps to just after the last payday plus the stop lag,
which can stretch `weeks_silent` to about 19 for monthly pay. Every wallet has at least 4 active weeks: `acquired_week` is clipped to at most
dormancy start minus 4.

**Step 1. Normal activity, from `acquired_week` until the decline starts.**

- `txn_count` is Poisson with a per-wallet rate. The rate is lognormal around the population's activity median.
- Payday weeks multiply the rate: every week for weekly pay, every second week for biweekly, every fourth
  or fifth week for monthly (calendar months).
- Holiday weeks multiply the rate for every wallet. This produces quiet dips that are not dormancy causes.
- Each week gets multiplicative lognormal noise with the population's sigma.
- `amount_bdt` is `txn_count` times a lognormal ticket size whose median depends on `worker_type`.
- `cashin_count` concentrates in payday weeks. `cashout_ok` follows cash-ins with a short lag.
- `app_share` is a per-wallet Beta draw around the population's channel mean, with small weekly jitter.
- `acquired_week` is uniform 0 to 40 for most wallets. solved_problem wallets draw from 10 to 40
  (shorter lives). Every acquisition week solved_problem uses is also used by other causes, so acquisition
  week alone never gives the cause away.

**Step 2. The cause shapes the weeks before dormancy.**

| Cause | Fingerprint |
| --- | --- |
| `job_exit` | Normal until the last payday before dormancy, then an abrupt stop after the stop lag. Cash-ins stop first: none in the last 2 to 4 weeks before dormancy (the last salary never arrives). |
| `migration` | `district_changed = 1` in one week, the migration lead before dormancy (never before acquisition). `app_share` shifts after it, then activity fades over 2 to 4 weeks. |
| `solved_problem` | Low activity, then a single burst week (several transactions, large amount), then quiet. |
| `fee_shock` | Decline starts the fee lag after `fee_week` (one lag draw per wallet, shared with the dormancy start). Amount per transaction falls before the count falls. |
| `supply_failure` | `cashout_fail` rises over the fail ramp before dormancy, while `cashout_ok` falls, then the wallet stops. |

**Step 3. Overlap, so no single clue gives the answer away.**

- About 5% of non-supply_failure wallets get a few random failed cash-outs.
- About 3% of non-migration wallets get a `district_changed` week.
- Every wallet lives through `fee_week`. Non-fee wallets react weakly or not at all.
- Some non-job_exit wallets happen to stop within a week of a payday.

**Step 4. Blended wallets.** A share of wallets get two causes applied together. The primary cause has
weight 0.5 to 0.8 and is the label. `blended = True`.

## Parameters

All numbers are ASSUMED design knobs unless a source is given. The A/B knobs live in `PARAMS`; the shared
constants (ticket sizes, payday and holiday factors, overlap rates) sit next to the code that uses them and
are ASSUMED too.

| Knob (A3) | A | B |
| --- | --- | --- |
| Pay cycle weekly / biweekly / monthly | 0.40 / 0.20 / 0.40 | 0.20 / 0.20 / 0.60 |
| Cause mix job_exit / solved_problem / fee_shock / supply_failure / migration | 0.35 / 0.22 / 0.13 / 0.15 / 0.15 | 0.25 / 0.15 / 0.25 / 0.20 / 0.15 |
| Activity median, transactions per week | 5 | 3 |
| Noise, lognormal sigma | 0.3 | 0.5 |
| Holiday weeks | 14, 24 | 12, 22 |
| Mean `app_share` | 0.60 | 0.35 |
| `fee_week` | 38 | 34 |
| job_exit stop lag after payday | 0-1 weeks | 0-2 weeks |
| migration lead (district change before dormancy) | 2-6 weeks | 1-4 weeks |
| fee_shock decline lag after `fee_week` | 0-3 weeks | 1-5 weeks |
| supply_failure fail ramp | 2-4 weeks | 1-3 weeks |
| Blended share | 0.20 | 0.30 |
| Worker type garment / domestic / transport / retail | 0.40 / 0.20 / 0.20 / 0.20 | 0.25 / 0.25 / 0.30 / 0.20 |

Sources and assumptions:

- The A cause mix rounds the IFC Côte d'Ivoire survey ratios (irregular income 43.6%, no need 27%, too
  expensive 15.5%) after leaving room for two causes the survey does not list. The mapping (irregular income to
  job_exit, no need to solved_problem, too expensive to fee_shock) is ours. The survey is from Côte d'Ivoire, not
  Bangladesh, and no Bangladesh cause survey was found. migration and supply_failure shares are ASSUMED.
- The B cause mix and every other number are ASSUMED.
- B represents a different market and year: poorer, less app-heavy, more monthly pay, a larger fee change.
  Holidays sit 2 weeks earlier because Eid moves about 11 days earlier each lunar year. B shapes are blurrier
  and B has more blended wallets, so B's refusal rate should come out higher than A's (A5).

## Checks

`tests/test_datagen.py` checks populations in memory. `tests/test_datagen_files.py` runs `main` once into a
temporary directory and checks the files. Both are written before the code.

- All output files exist. Wallet counts are 4800, 1200 and 3000.
- All 5 causes appear in A-train labels and in B truth.
- B's cause mix and pay-cycle mix differ from A's.
- Every wallet has 3 to 20 silent weeks at the end, at least 4 weeks of history before that, and at least one
  transaction.
- The same seed produces identical frames.
- `data/a_test/` and `data/b/` contain no `cause` column. Labels for A-test and B exist only under `truth/`.
- One full run finishes in under 60 seconds.

The generator's realism is also checked downstream by Tasks 3 and 5: the best single feature must score well
below the full model, the shuffled-label control must sit near chance, B must score below A without
collapsing, and B's refusal rate must be higher than A's. The only planned generator change after Task 1 is
Task 5's: raise B's ambiguity or noise if B's refusal rate is not higher than A's. We do not tune the
generator toward a target score.

## Housekeeping

- `.gitignore`: add `data/a_test/`, `data/b/` and `truth/*`, keeping `!truth/.gitkeep`.
- Add an empty `truth/.gitkeep`.
- No new dependencies: numpy, pandas and pyarrow are already in `pyproject.toml`.

## Out of scope

- Per-transaction or per-day data.
- Agent interactions, balances or P2P networks.
- Any real data, names or phone numbers.
- A sixth "ambiguous" cause.
