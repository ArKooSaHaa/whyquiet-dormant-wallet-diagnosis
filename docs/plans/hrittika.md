# Hrittika — Data, model & accuracy

> Read [README.md](README.md) (team rules) and [seed-bundle.md](../contracts/seed-bundle.md) first.
> You are the critical path. Your one deliverable is **`web/public/seed.json` pushed by H5**.
> You own: `datagen/`, `src/model/`, `truth/`, `data/`, `scripts/export_seed.py`, model/datagen tests.

## Rules you must not break (judges will check)
- `src/model` never imports or reads `truth/` (`tests/test_no_truth_import.py` must stay green).
- Model trains on **population A train only** (`data/train/labels.parquet`). A-test and all of B → `truth/`.
- Headline accuracy is **B only**, always shown beside the rule baseline and shuffled-label control.
- Refusal rate 0% on A or B = failing test.
- `shap` package is offline-only. At runtime use LightGBM `predict(..., pred_contrib=True)`.
- All data is synthetic. No real names/phones; wallet IDs `W-XXXXXX`.

## Prompt prefix (paste at the top of every task prompt)
```
You are working in the WhyQuiet repo. Read AGENTS.md, docs/plans/hrittika.md and
docs/contracts/seed-bundle.md. Use the ponytail skill (full) — simplest code that works, numpy/pandas/
lightgbm/sklearn only, no new dependencies, no speculative abstractions. Use
superpowers:test-driven-development (write the failing test first). If anything fails, use
superpowers:systematic-debugging. Before claiming done, use superpowers:verification-before-completion
and show the output of: uv run ruff check src tests datagen scripts && uv run pyright && uv run pytest -q
Only edit: datagen/, src/model/, scripts/export_seed.py, scripts/evaluate.py, tests/test_datagen*.py,
tests/test_model*.py, tests/test_export_seed.py, .gitignore (data lines only), web/public/seed.json.
```

---

### Task 1 — Generator: populations A and B (H0.5–2)

**Files:** `datagen/generate.py`, `tests/test_datagen.py`
**Produces:**
- `data/train/wallets.parquet`, `data/train/labels.parquet` (A-train: features input + cause labels)
- `data/a_test/wallets.parquet`, `data/b/wallets.parquet` (no labels)
- `truth/a_test_labels.parquet`, `truth/b_labels.parquet` (`wallet_id, cause`)
- Wallet table columns: `wallet_id, worker_type, pay_cycle, acquired_week, series` (weekly `txn_count`, `amount_bdt`) — or long-format txn table; your choice, keep it simple.

**Acceptance:**
- `uv run python -m datagen.generate --seed 42` writes all files in < 60 s.
- 5 causes each have a distinct decline fingerprint (e.g. job_exit = abrupt stop after last payday; migration = location/channel change then fade; solved_problem = single burst then quiet; fee_shock = drop right after a fee event; supply_failure = failed cash-out attempts then stop).
- Plus an "ambiguous" share (~15–25%) whose shapes are blended/noisy, so refusals happen.
- **B differs from A in all of (A3):** pay-cycle mix, cause prior mix, activity level, noise level, holiday timing, channel mix, per-cause shape parameters. Put both parameter sets in one dict at the top of the file.
- Test: files exist, row counts, all 5 causes present in A-train and B, B mix ≠ A mix.
- Generated data is regenerable from the seed, so don't commit it: add `data/a_test/`, `data/b/` and `truth/*` (keep `!truth/.gitkeep`) to `.gitignore` (you may edit that one file). Only `web/public/seed.json` gets committed.

**Prompt:**
```
<prefix>
Task 1: Build datagen/generate.py, a synthetic dormant-wallet generator (numpy + pandas, write parquet).
Two populations A and B with 5 causes (job_exit, migration, solved_problem, fee_shock, supply_failure),
each with an observable weekly decline fingerprint, plus 15-25% ambiguous/blended wallets. B must differ
from A in pay-cycle mix, cause priors, activity level, noise, holiday timing, channel mix and per-cause
shape params (A3 in docs/PROJECT.md). Sizes: A=6000 (80/20 train/test), B=3000. Outputs exactly as
listed in Task 1 of docs/plans/hrittika.md. Labels for A-train go to data/train/labels.parquet; A-test and
B labels go ONLY to truth/. CLI: python -m datagen.generate --seed 42. Keep it one file.
Write tests/test_datagen.py first.
```

### Task 2 — Features + classifier + refusal (H2–4)

**Files:** `src/model/features.py`, `src/model/train.py`, `tests/test_model.py`
**Interfaces (used by export):**
```python
features(wallets: pd.DataFrame) -> pd.DataFrame            # one row per wallet, ~15-25 shape features
train(seed: int) -> lgb.Booster                            # reads data/train only
predict(booster, X) -> tuple[np.ndarray, np.ndarray]       # (proba [n,5], contrib [n, n_features+1, 5] or per-class)
decide(proba, tau, delta) -> tuple[list[str|None], list[list[str]]]  # (cause or None, refusal_reasons)
```
**Acceptance:**
- No single feature is a leak (check later in Task 3).
- Refusal: `max(p) < tau` OR `p1 - p2 < delta` → refused, with reasons in plain English (e.g. "Top cause 0.34 < τ 0.50", "job_exit vs migration margin 0.04 < δ 0.10", "No feature contributes > 0.05").
- tau/delta tuned on a **validation slice of A-train**, never on B.
- Test: `decide` refuses a uniform posterior, attributes a peaked one; `src/model` has no `truth` import.

**Prompt:**
```
<prefix>
Task 2: In src/model/ write features.py (shape features from the weekly series: weeks_silent,
slope of last 8 weeks, payday-only ratio, burst-then-quiet score, post-fee drop, channel switch,
failed-cashout count, etc.; 15-25 features) and train.py with train(seed), predict(booster, X) using
LightGBM multiclass and pred_contrib=True for contributions, and decide(proba, tau, delta) implementing
calibrated refusal with human-readable reasons. Tune tau/delta on a validation split of A-train only.
Never read truth/. Signatures exactly as in Task 2 of docs/plans/hrittika.md. Tests first.
```

### 🛑 H4 GATE (you decide, tell the team in chat)
Run on B: model macro-F1 (attributed wallets) vs rule baseline macro-F1.
**Rule baseline for F1** = constant prediction of A-train's most common cause (the "message everyone" rule
can't name causes; document this in the report).
- Pass → continue.
- Fail → cut to the causes that separate (look at the confusion matrix), re-run, log a DECISIONS.md row. Don't spend > 30 min here.

### Task 3 — Evaluation report (H4–4.75)

**Files:** `scripts/evaluate.py` (scripts may read `truth/`; `src/model` may not), `tests/test_model_eval.py`.
**Produces:** the `report.ml`, `report.confusion_b`, `report.fairness` objects from the contract.
- macro-F1 A-test and B, gap, refusal rate A and B, ECE on B (10 bins, plain numpy).
- Shuffled-label control: retrain on shuffled A-train labels, F1 on B (expect ~0.2).
- Best single feature: train a 1-feature model per feature, report max F1 on B (should be well below the full model).
- Fairness: macro-F1 and refusal rate per `worker_type` and per `pay_cycle` on B.

**Prompt:**
```
<prefix>
Task 3: Write scripts/evaluate.py (allowed to read truth/; src/model is not) that returns dicts matching
report.ml, report.confusion_b and report.fairness in docs/contracts/seed-bundle.md: macro-F1 on A-test
and B, gap, refusal rates, ECE on B (numpy, 10 bins), shuffled-label control, best single-feature F1,
rule-baseline F1 (constant majority cause from A-train), fairness by worker_type and pay_cycle.
Use sklearn.metrics. Test with a tiny hand-made frame first.
```

### Task 4 — Export `seed.json` (H4.75–5) ⭐ deliverable

**Files:** `scripts/export_seed.py`, `tests/test_export_seed.py`
- Sample ≤ 400 B wallets stratified by verdict × cause (make sure ~20%+ are refused).
- Contributions: top 8 by |value| for the predicted cause (or top posterior cause if refused).
- Calls Arko's `src.rules.baseline.rule_baseline`, `src.rules.remedies.REMEDIES`, `src.rules.money.money_table(n_triaged, n_correct, n_wrong, n_refused)` over the **full** B. If an import fails, write `money: null` and carry on.
- Writes `web/public/seed.json` (< 3 MB). Validate shape in the test (keys, types, `cause is None iff refused`).
- **Push and post in chat: "seed.json is live".**

**Prompt:**
```
<prefix>
Task 4: Write scripts/export_seed.py that runs generate -> train -> predict/decide on B -> evaluate,
then writes web/public/seed.json exactly matching docs/contracts/seed-bundle.md. Sample <=400 B
wallets stratified by verdict x cause, >=20% refused. Use src.rules.baseline.rule_baseline,
src.rules.remedies.REMEDIES and src.rules.money.money_table (if import fails, money=null). Metrics
use all of B. Test validates the JSON shape. One command: uv run python scripts/export_seed.py --seed 42
```

### Task 5 — Hardening (H5–6.5)
- Re-run with seeds 1, 2, 3; report mean ± range of B macro-F1 (one line in report).
- Check refusal rate on B > A (A5). If not, increase B ambiguity/noise in generator params.
- Re-export `seed.json` once at the end. Don't re-export after H7.5.

### Task 6 — Numbers for README (H6.5–7.5)
Send Arko a markdown block: B headline F1, A-test F1, gap, rule baseline, shuffled control, best single
feature, refusal A/B, ECE, fairness table, plus the A1/A3 honesty sentences verbatim. Every number from
`seed.json`, no rounding games.

## Done checklist
- [x] `web/public/seed.json` matches the contract (`scripts/export_seed.py --seed 42`, 400 wallets, 100 refused); on main (PR #4)
- [x] Seeds 1, 2, 3: B macro-F1 0.868 mean, 0.847-0.886 range; refusal B > A on every seed (D33)
- [x] `uv run pytest -q` green incl. no-truth-import test (88 passed)
- [x] Refusal rate > 0 on A and B; B ≥ A (9.3% A-test, 21.7% B)
- [x] Shuffled control ≈ chance; best single feature ≪ full model (0.162 and 0.373 vs 0.864)
- [ ] Results block sent to Arko
