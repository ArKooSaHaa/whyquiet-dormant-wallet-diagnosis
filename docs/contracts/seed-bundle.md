# Contract 1 — Seed bundle (`web/public/seed.json`)

> FROZEN at H0. Writer: **Hrittika** (`scripts/export_seed.py`). Readers: **Shads** (web).
> Change = one PR touching only this file + a message in team chat. Additive fields are fine; renames are not.

## Why a static file
All read screens (queue, wallet detail, refusal, money & evidence) render from this one file, served by
Vercel's CDN and by `vite dev`. No API call, no DB, works offline (D6). The API exists only for writes.

## Shape (TypeScript notation; Python writes the same JSON)

```ts
type Cause = "job_exit" | "migration" | "solved_problem" | "fee_shock" | "supply_failure";

type SeedBundle = {
  meta: {
    generated_at: string;          // ISO-8601
    seed: number;                  // RNG seed used for datagen + training
    model_version: string;         // e.g. "lgbm-v1"
    tau: number;                   // refusal: max posterior threshold
    delta: number;                 // refusal: top-2 margin threshold
    n_wallets_b_total: number;     // size of full population B (metrics use all of it)
    honesty_line: string;          // A1 sentence, verbatim
  };
  wallets: Wallet[];               // SAMPLE of population B for the UI (<= 400, stratified, includes refusals)
  report: Report;
  remedies: Record<Cause, Remedy>; // copied from src/rules/remedies.py at export time
};

type Wallet = {
  wallet_id: string;               // "W-" + 6 chars [0-9A-Z]
  worker_type: string;             // e.g. "garment" | "domestic" | "transport" | "retail"
  pay_cycle: "weekly" | "biweekly" | "monthly";
  weeks_silent: number;
  series: { week: number; txn_count: number; amount_bdt: number }[];  // weekly, since acquisition
  verdict: "attributed" | "refused";
  cause: Cause | null;             // null iff refused
  posterior: Record<Cause, number>;                                   // sums to ~1
  contributions: { feature: string; value: number; contribution: number }[]; // top 8, |contribution| desc, toward predicted/top cause
  refusal_reasons: string[];       // [] iff attributed
  rule_baseline: { fired: boolean; action: "message_everyone" | "none" };
};

type Report = {
  ml: {
    macro_f1_a_test: number;
    macro_f1_b: number;            // HEADLINE
    gap: number;                   // a_test - b
    refusal_rate_a: number;
    refusal_rate_b: number;
    ece_b: number;                 // expected calibration error on B
    shuffled_label_f1_b: number;   // control, should be ~0.2
    best_single_feature: string;
    best_single_feature_f1_b: number;
    rule_baseline_f1_b: number;
  };
  confusion_b: { labels: Cause[]; matrix: number[][] };   // rows = true, cols = predicted (attributed only)
  fairness: { slice: "worker_type" | "pay_cycle"; group: string; n: number; macro_f1: number; refusal_rate: number }[];
  money: MoneyRow[] | null;        // null if src/rules.money not ready at export time
  assumptions: string[];           // every ASSUMED input, one line each
};

type MoneyRow = {
  recovery_rate: 0.01 | 0.04 | 0.08;
  strategy: "rule" | "model" | "oracle";
  wallets_actioned: number;
  users_recovered: number;
  cost_bdt: number;
  value_bdt: number;               // users_recovered * ARPU * ramp - cost
};

type Remedy = { remedy_code: string; label: string; unit_cost_bdt: number; message_en: string; message_bn: string };
```

## `src/rules` functions the exporter calls (owner: **Arko**, frozen signatures)

```python
# src/rules/baseline.py
def rule_baseline(weeks_silent: int) -> dict:  # {"fired": bool, "action": "message_everyone" | "none"}

# src/rules/remedies.py
REMEDIES: dict[str, dict]  # cause -> {"remedy_code","label","unit_cost_bdt","message_en","message_bn"}

# src/rules/money.py
ASSUMPTIONS: list[str]
def money_table(n_triaged: int, n_correct: int, n_wrong: int, n_refused: int) -> list[dict]:
    """Rows for strategy in (rule, model, oracle) x recovery_rate in (0.01, 0.04, 0.08). Shape = MoneyRow."""
```

## Sample
`web/public/seed.sample.json` (written by Shads, Task 0) is a hand-made 20-wallet file in this exact
shape, so the UI works before the model exists. The UI loads `seed.json` and falls back to
`seed.sample.json` if that's missing.
