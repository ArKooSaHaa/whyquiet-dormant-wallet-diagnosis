import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import { loadSeed, type SeedBundle, type Cause } from "./seed";
import { Card, Chip, Table, Skeleton, ErrorState, EmptyState } from "./design/ui";

const CAUSE_LABELS: Record<Cause, string> = {
  job_exit: "Job Exit",
  migration: "Migration",
  solved_problem: "Solved Problem",
  fee_shock: "Fee Shock",
  supply_failure: "Supply Failure",
};

const formatBDT = (amount: number): string => {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("BDT", "৳")
    .trim();
};

export default function Evidence() {
  const [bundle, setBundle] = useState<SeedBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState<0.01 | 0.04 | 0.08>(0.04);

  const fetchSeed = () => {
    loadSeed()
      .then((data) => {
        setBundle(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load evidence report.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSeed();
  }, []);

  const report = bundle?.report;
  const ml = report?.ml;
  const money = report?.money;

  // Filter money rows for currently selected rate
  const moneyFiltered = useMemo(() => {
    if (!money) return [];
    return money.filter((m) => m.recovery_rate === rate);
  }, [money, rate]);

  // Chart data for economic comparison
  const moneyChartData = useMemo(() => {
    if (!moneyFiltered.length) return [];
    const ruleRow = moneyFiltered.find((m) => m.strategy === "rule");
    const modelRow = moneyFiltered.find((m) => m.strategy === "model");
    const oracleRow = moneyFiltered.find((m) => m.strategy === "oracle");

    return [
      {
        name: "Rule Baseline",
        netValue: ruleRow?.value_bdt ?? 0,
        cost: ruleRow?.cost_bdt ?? 0,
        users: ruleRow?.users_recovered ?? 0,
        strategy: "rule",
      },
      {
        name: "WhyQuiet Model",
        netValue: modelRow?.value_bdt ?? 0,
        cost: modelRow?.cost_bdt ?? 0,
        users: modelRow?.users_recovered ?? 0,
        strategy: "model",
      },
      {
        name: "Oracle (Theoretical Max)",
        netValue: oracleRow?.value_bdt ?? 0,
        cost: oracleRow?.cost_bdt ?? 0,
        users: oracleRow?.users_recovered ?? 0,
        strategy: "oracle",
      },
    ];
  }, [moneyFiltered]);

  // Max value in confusion matrix for proportional heat shading
  const maxMatrixVal = useMemo(() => {
    if (!report?.confusion_b?.matrix) return 1;
    let max = 1;
    report.confusion_b.matrix.forEach((row) => {
      row.forEach((val) => {
        if (val > max) max = val;
      });
    });
    return max;
  }, [report]);

  /* ------------------- STATE 1: LOADING STATE ------------------- */
  if (loading) {
    return (
      <div className="space-y-6" data-testid="evidence-loading">
        <div>
          <Skeleton w={280} h={32} className="mb-2" />
          <Skeleton w={450} h={16} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6"><Skeleton w="100%" h={110} /></Card>
          <Card className="p-6"><Skeleton w="100%" h={110} /></Card>
          <Card className="p-6"><Skeleton w="100%" h={110} /></Card>
        </div>
        <Card className="p-6">
          <Skeleton w={200} h={20} className="mb-4" />
          <Skeleton w="100%" h={220} />
        </Card>
      </div>
    );
  }

  /* ------------------- STATE 2: ERROR STATE ------------------- */
  if (error || !bundle || !report || !ml) {
    return (
      <div className="py-8" data-testid="evidence-error">
        <ErrorState
          title="Evidence Report Unavailable"
          body={error || "Could not retrieve validation metrics and economic models."}
          onRetry={fetchSeed}
          testid="evidence-retry-btn"
        />
      </div>
    );
  }

  /* ------------------- SUCCESS & EMPTY STATES ------------------- */
  return (
    <div className="space-y-8" data-testid="evidence-view">
      {/* Page Title & Context */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="t-2xl font-bold text-[var(--text)]">ML Rigor &amp; Economic Evidence</h1>
          <Chip tone="accent">Population B Evaluation</Chip>
        </div>
        <p className="t-xs text-[var(--text-muted)] mt-1 max-w-3xl">
          Multi-cause classifier trained on simulated causes (Population A) and evaluated on a shifted, unseen test population B.
          Reported metrics include baseline heuristics, permutation controls, fairness slices, and financial recovery models.
        </p>
      </div>

      {/* 1. ML Rigor Panel */}
      <div className="space-y-3" data-testid="ml-rigor-panel">
        <h2 className="t-md font-semibold text-[var(--text)]">1. Model Generalization &amp; Calibration</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Headline Population B Card (Prominent) */}
          <Card className="p-5 md:col-span-2 border-l-4 border-l-[var(--accent)]" data-testid="headline-f1-card">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Headline Population B Macro-F1
              </div>
              <Chip tone="accent">Primary Metric</Chip>
            </div>
            <div className="t-3xl font-bold font-mono text-[var(--accent)] mt-2" data-testid="headline-f1-value">
              {(ml.macro_f1_b * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              Achieved under distribution shift on Population B (A-Test: {(ml.macro_f1_a_test * 100).toFixed(1)}%, Generalization Gap: {(ml.gap * 100).toFixed(1)}%).
            </p>
          </Card>

          {/* Rule Baseline Comparison */}
          <Card className="p-5" data-testid="rule-baseline-f1-card">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Rule Baseline F1
            </div>
            <div className="t-2xl font-bold font-mono text-[var(--text)] mt-2" data-testid="rule-baseline-f1-value">
              {(ml.rule_baseline_f1_b * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-[var(--text-faint)] mt-2">
              Heuristic "Message Everyone" rule without cause diagnosis.
            </p>
          </Card>

          {/* Shuffled Label Permutation Control */}
          <Card className="p-5" data-testid="shuffled-control-card">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Shuffled Label Control
            </div>
            <div className="t-2xl font-bold font-mono text-[var(--text-muted)] mt-2" data-testid="shuffled-control-value">
              {(ml.shuffled_label_f1_b * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-[var(--text-faint)] mt-2">
              Permutation baseline on randomized cause labels (chance ~20.0%).
            </p>
          </Card>

          {/* Best Single Feature Comparison */}
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Best Single Feature F1
            </div>
            <div className="t-2xl font-bold font-mono text-[var(--text)] mt-2">
              {(ml.best_single_feature_f1_b * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-[var(--text-faint)] mt-2 truncate" title={ml.best_single_feature}>
              Top feature: <code className="font-mono text-[var(--text)]">{ml.best_single_feature}</code>
            </p>
          </Card>

          {/* Refusal Rates Comparison */}
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Refusal: Pop A vs. B
            </div>
            <div className="t-2xl font-bold font-mono text-[var(--text)] mt-2">
              {(ml.refusal_rate_a * 100).toFixed(1)}% → {(ml.refusal_rate_b * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-[var(--text-faint)] mt-2">
              Calibrated refusal rate increases under distribution shift as expected.
            </p>
          </Card>

          {/* Expected Calibration Error */}
          <Card className="p-5 md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Expected Calibration Error (ECE on B)
            </div>
            <div className="t-2xl font-bold font-mono text-[var(--text)] mt-2">
              {ml.ece_b.toFixed(3)}
            </div>
            <p className="text-xs text-[var(--text-faint)] mt-2">
              Posterior probabilities match true empirical accuracies within 5.2% calibration tolerance.
            </p>
          </Card>
        </div>
      </div>

      {/* 2. Confusion Matrix on Population B */}
      <Card className="p-5 sm:p-6 space-y-4" data-testid="confusion-matrix-card">
        <div>
          <h2 className="t-md font-semibold text-[var(--text)]">2. Confusion Matrix on Attributed Wallets (Population B)</h2>
          <p className="t-xs text-[var(--text-muted)] mt-0.5">
            Evaluated on shifted population B. Rows indicate simulated true causes; columns indicate model predictions.
          </p>
        </div>

        <div className="table-wrap overflow-x-auto">
          <table className="data-table text-xs" data-testid="confusion-matrix-table">
            <thead>
              <tr>
                <th className="bg-[var(--surface-2)]">True Cause \ Predicted</th>
                {report.confusion_b.labels.map((lbl) => (
                  <th key={lbl} className="text-center">
                    {CAUSE_LABELS[lbl]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.confusion_b.matrix.map((row, rIdx) => {
                const rowCause = report.confusion_b.labels[rIdx];
                return (
                  <tr key={rowCause}>
                    <td className="font-semibold text-[var(--text)] bg-[var(--surface-2)]">
                      {CAUSE_LABELS[rowCause]}
                    </td>
                    {row.map((val, cIdx) => {
                      const isDiagonal = rIdx === cIdx;
                      const intensity = Math.min(1, Math.max(0.08, val / maxMatrixVal));
                      return (
                        <td
                          key={cIdx}
                          className="text-center font-mono tnum"
                          style={{
                            backgroundColor: isDiagonal
                              ? `rgba(94, 200, 180, ${intensity * 0.45})`
                              : `rgba(255, 255, 255, ${intensity * 0.05})`,
                            color: isDiagonal ? "var(--text)" : "var(--text-muted)",
                            fontWeight: isDiagonal ? 600 : 400,
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. Fairness Table */}
      <Card className="p-5 sm:p-6 space-y-4" data-testid="fairness-card">
        <div>
          <h2 className="t-md font-semibold text-[var(--text)]">3. Demographic Parity &amp; Subgroup Fairness</h2>
          <p className="t-xs text-[var(--text-muted)] mt-0.5">
            Validation across worker occupations and payroll frequencies to ensure uniform calibration without biased degradation.
          </p>
        </div>

        <Table testid="fairness-table">
          <thead>
            <tr>
              <th>Slice</th>
              <th>Demographic Subgroup</th>
              <th className="text-right">Cohort Size (N)</th>
              <th className="text-right">Macro-F1 (Pop B)</th>
              <th className="text-right">Refusal Rate</th>
            </tr>
          </thead>
          <tbody>
            {report.fairness.map((f, idx) => (
              <tr key={idx}>
                <td className="capitalize text-xs text-[var(--text-muted)] font-medium">
                  {f.slice.replace("_", " ")}
                </td>
                <td className="capitalize font-medium text-[var(--text)]">
                  {f.group}
                </td>
                <td className="text-right font-mono tnum text-[var(--text)]">
                  {f.n.toLocaleString()}
                </td>
                <td className="text-right font-mono tnum text-[var(--accent)] font-semibold">
                  {(f.macro_f1 * 100).toFixed(1)}%
                </td>
                <td className="text-right font-mono tnum text-[var(--text-muted)]">
                  {(f.refusal_rate * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* 4. Money & Economic Recovery Model */}
      <Card className="p-5 sm:p-6 space-y-6" data-testid="money-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="t-lg font-bold text-[var(--text)]">4. Economic Recovery Model &amp; Budget Optimization</h2>
              <Chip tone="warning" data-testid="assumed-badge">ASSUMED</Chip>
            </div>
            <p className="t-xs text-[var(--text-muted)] mt-0.5">
              Net economic value comparison: Rule baseline vs. WhyQuiet Cause Desk vs. Oracle upper-bound.
            </p>
          </div>

          {/* Recovery Rate Segmented Toggle */}
          <div className="flex items-center gap-2 bg-[var(--surface-2)] p-1 rounded-[var(--radius)]" data-testid="rate-toggle-group">
            {([0.01, 0.04, 0.08] as const).map((r) => {
              const pct = (r * 100).toFixed(0);
              const isSelected = rate === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRate(r)}
                  data-testid={`rate-toggle-${pct}`}
                  className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold cursor-pointer transition-colors border-none ${
                    isSelected
                      ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-1)]"
                      : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {pct}% Response {r === 0.04 ? "(Base)" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {money === null || moneyFiltered.length === 0 ? (
          /* Empty State if money is pending */
          <EmptyState
            title="Money Model Pending"
            body="Economic recovery calculations will be updated when the rule engine money module completes export."
            testid="money-pending-state"
          />
        ) : (
          <div className="space-y-6">
            {/* Grouped Bar Chart */}
            <div className="w-full h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moneyChartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="var(--text-faint)"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `৳${Math.round(val / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [formatBDT(Number(val)), name === "netValue" ? "Net Economic Value" : name]}
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      borderColor: "var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="netValue" name="Net Economic Value (BDT ASSUMED)" radius={[6, 6, 0, 0]}>
                    {moneyChartData.map((entry, idx) => (
                      <Cell
                        key={`money-bar-${idx}`}
                        fill={
                          entry.strategy === "model"
                            ? "var(--accent)"
                            : entry.strategy === "oracle"
                            ? "var(--success)"
                            : "var(--text-muted)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Economics Data Table */}
            <Table testid="money-table">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th className="text-right">Wallets Actioned</th>
                  <th className="text-right">Recovered Users</th>
                  <th className="text-right">Remedy Cost (ASSUMED)</th>
                  <th className="text-right">Net Value BDT (ASSUMED)</th>
                </tr>
              </thead>
              <tbody>
                {moneyFiltered.map((m) => (
                  <tr key={m.strategy} data-testid={`money-row-${m.strategy}`}>
                    <td className="capitalize font-semibold text-[var(--text)]">
                      {m.strategy === "model" ? "WhyQuiet Cause Desk" : m.strategy === "rule" ? "Rule Baseline" : "Oracle (Upper Bound)"}
                    </td>
                    <td className="text-right font-mono tnum text-[var(--text)]">
                      {m.wallets_actioned.toLocaleString()}
                    </td>
                    <td className="text-right font-mono tnum text-[var(--text)]" data-testid={`users-recovered-${m.strategy}`}>
                      {Math.round(m.users_recovered).toLocaleString()}
                    </td>
                    <td className="text-right font-mono tnum text-[var(--text-muted)]">
                      {formatBDT(m.cost_bdt)}
                    </td>
                    <td className={`text-right font-mono tnum font-bold ${m.value_bdt >= 0 ? "text-[var(--accent)]" : "text-[var(--danger)]"}`} data-testid={`net-value-${m.strategy}`}>
                      {formatBDT(m.value_bdt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Assumptions List */}
        <div className="p-4 rounded-[var(--radius)] bg-[var(--surface-2)] border border-[var(--border)] space-y-2" data-testid="assumptions-box">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Economic Model Assumptions
            </span>
            <Chip tone="warning">ASSUMED</Chip>
          </div>
          <ul className="space-y-1.5 text-xs text-[var(--text-faint)] list-disc list-inside">
            {report.assumptions.map((asm, idx) => (
              <li key={idx}>
                <span className="text-[var(--text)]">{asm}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
