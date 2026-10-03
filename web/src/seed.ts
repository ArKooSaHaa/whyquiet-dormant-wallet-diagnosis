export type Cause =
  | "job_exit"
  | "migration"
  | "solved_problem"
  | "fee_shock"
  | "supply_failure";

export type SeedBundle = {
  meta: {
    generated_at: string; // ISO-8601
    seed: number; // RNG seed used for datagen + training
    model_version: string; // e.g. "lgbm-v1" or "sample"
    tau: number; // refusal: max posterior threshold
    delta: number; // refusal: top-2 margin threshold
    n_wallets_b_total: number; // size of full population B (metrics use all of it)
    honesty_line: string; // A1 sentence, verbatim
  };
  wallets: Wallet[]; // SAMPLE of population B for the UI (<= 400, stratified, includes refusals)
  report: Report;
  remedies: Record<Cause, Remedy>; // copied from src/rules/remedies.py at export time
};

export type Wallet = {
  wallet_id: string; // "W-" + 6 chars [0-9A-Z]
  worker_type: string; // e.g. "garment" | "domestic" | "transport" | "retail"
  pay_cycle: "weekly" | "biweekly" | "monthly";
  weeks_silent: number;
  series: { week: number; txn_count: number; amount_bdt: number }[]; // weekly, since acquisition
  verdict: "attributed" | "refused";
  cause: Cause | null; // null iff refused
  posterior: Record<Cause, number>; // sums to ~1
  contributions: { feature: string; value: number; contribution: number }[]; // top 8, |contribution| desc, toward predicted/top cause
  refusal_reasons: string[]; // [] iff attributed
  rule_baseline: { fired: boolean; action: "message_everyone" | "none" };
};

export type Report = {
  ml: {
    macro_f1_a_test: number;
    macro_f1_b: number; // HEADLINE
    gap: number; // a_test - b
    refusal_rate_a: number;
    refusal_rate_b: number;
    ece_b: number; // expected calibration error on B
    shuffled_label_f1_b: number; // control, should be ~0.2
    best_single_feature: string;
    best_single_feature_f1_b: number;
    rule_baseline_f1_b: number;
  };
  confusion_b: { labels: Cause[]; matrix: number[][] }; // rows = true, cols = predicted (attributed only)
  fairness: {
    slice: "worker_type" | "pay_cycle";
    group: string;
    n: number;
    macro_f1: number;
    refusal_rate: number;
  }[];
  money: MoneyRow[] | null; // null if src/rules.money not ready at export time
  assumptions: string[]; // every ASSUMED input, one line each
};

export type MoneyRow = {
  recovery_rate: 0.01 | 0.04 | 0.08;
  strategy: "rule" | "model" | "oracle";
  wallets_actioned: number;
  users_recovered: number;
  cost_bdt: number;
  value_bdt: number; // users_recovered * ARPU * ramp - cost
};

export type Remedy = {
  remedy_code: string;
  label: string;
  unit_cost_bdt: number;
  message_en: string;
  message_bn: string;
};

let cachedSeedPromise: Promise<SeedBundle> | null = null;
let sampleFallbackUsed = false;

export function isSampleFallbackUsed(): boolean {
  return sampleFallbackUsed;
}

export function loadSeed(): Promise<SeedBundle> {
  if (cachedSeedPromise) {
    return cachedSeedPromise;
  }

  cachedSeedPromise = (async () => {
    try {
      const res = await fetch("/seed.json");
      if (res.ok) {
        sampleFallbackUsed = false;
        return (await res.json()) as SeedBundle;
      }
    } catch {
      // Fall through to sample
    }

    const fallbackRes = await fetch("/seed.sample.json");
    if (!fallbackRes.ok) {
      throw new Error("Failed to load both /seed.json and /seed.sample.json");
    }
    sampleFallbackUsed = true;
    return (await fallbackRes.json()) as SeedBundle;
  })();

  return cachedSeedPromise;
}
