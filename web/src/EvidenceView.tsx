import { useState, useEffect } from "react";
import { Card, Chip, Button, Table, Skeleton, EmptyState, ErrorState } from "./design/ui";
import { loadSeed, type SeedBundle } from "./seed";

export default function EvidenceView() {
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

  /* 1. Loading State */
  if (loading) {
    return (
      <div className="space-y-6" data-testid="evidence-loading">
        <Skeleton w={220} h={32} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6"><Skeleton w="100%" h={100} /></Card>
          <Card className="p-6"><Skeleton w="100%" h={100} /></Card>
          <Card className="p-6"><Skeleton w="100%" h={100} /></Card>
        </div>
      </div>
    );
  }

  /* 2. Error State */
  if (error || !bundle) {
    return (
      <div className="py-8" data-testid="evidence-error">
        <ErrorState
          title="Evidence Report Unavailable"
          body={error || "Could not retrieve validation evidence metrics."}
          onRetry={fetchSeed}
        />
      </div>
    );
  }

  const ml = bundle.report.ml;
  const money = bundle.report.money;
  const moneyFiltered = money ? money.filter((m) => m.recovery_rate === rate) : [];

  return (
    <div className="space-y-6" data-testid="evidence-view">
      {/* Top Header */}
      <div>
        <h1 className="t-2xl font-bold text-[var(--text)]">ML Rigor & Economic Evidence</h1>
        <p className="t-xs text-[var(--text-muted)] mt-1">
          Headline metrics on shifted population B, control baselines, and cost recovery models.
        </p>
      </div>

      {/* Headline ML Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-l-4 border-l-[var(--accent)]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Headline B Macro-F1
          </div>
          <div className="t-3xl font-bold font-mono text-[var(--accent)] mt-2">
            {(ml.macro_f1_b * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-[var(--text-faint)] mt-2">
            Distribution shifted population B (A-Test: {(ml.macro_f1_a_test * 100).toFixed(1)}%)
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Rule Baseline F1
          </div>
          <div className="t-3xl font-bold font-mono text-[var(--text)] mt-2">
            {(ml.rule_baseline_f1_b * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-[var(--text-faint)] mt-2">
            Heuristic "Message Everyone" rule
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Shuffled Label Control
          </div>
          <div className="t-3xl font-bold font-mono text-[var(--text-muted)] mt-2">
            {(ml.shuffled_label_f1_b * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-[var(--text-faint)] mt-2">
            Permutation baseline (chance ~20.0%)
          </div>
        </Card>
      </div>

      {/* Fairness Breakdown */}
      <Card className="p-6 space-y-4">
        <h3 className="t-md font-semibold text-[var(--text)]">Fairness & Demographic Parity (Population B)</h3>
        <Table testid="fairness-table">
          <thead>
            <tr>
              <th>Slice</th>
              <th>Demographic Group</th>
              <th className="text-right">Cohort Size</th>
              <th className="text-right">Macro-F1</th>
              <th className="text-right">Refusal Rate</th>
            </tr>
          </thead>
          <tbody>
            {bundle.report.fairness.map((f, idx) => (
              <tr key={idx}>
                <td className="capitalize text-xs text-[var(--text-muted)]">{f.slice.replace("_", " ")}</td>
                <td className="capitalize font-medium text-[var(--text)]">{f.group}</td>
                <td className="text-right font-mono tnum text-[var(--text)]">{f.n}</td>
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

      {/* Economics / Money Section */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="t-md font-semibold text-[var(--text)]">Economic Recovery Model</h3>
              <Chip tone="warning">ASSUMED</Chip>
            </div>
            <p className="t-xs text-[var(--text-muted)] mt-0.5">
              Net value calculation across simulated reactivation response rates
            </p>
          </div>

          <div className="flex gap-2">
            {([0.01, 0.04, 0.08] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={rate === r ? "primary" : "secondary"}
                onClick={() => setRate(r)}
                data-testid={`rate-toggle-${(r * 100).toFixed(0)}`}
              >
                {(r * 100).toFixed(0)}% Rate
              </Button>
            ))}
          </div>
        </div>

        {money === null || moneyFiltered.length === 0 ? (
          /* 3. Empty state */
          <EmptyState
            title="Money Model Pending"
            body="Economic recovery calculations will be updated with the latest model run."
          />
        ) : (
          /* 4. Success state table */
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
              {moneyFiltered.map((m, idx) => (
                <tr key={idx}>
                  <td className="capitalize font-medium text-[var(--text)]">{m.strategy}</td>
                  <td className="text-right font-mono tnum text-[var(--text)]">{m.wallets_actioned.toLocaleString()}</td>
                  <td className="text-right font-mono tnum text-[var(--text)]">{m.users_recovered.toLocaleString()}</td>
                  <td className="text-right font-mono tnum text-[var(--text)]">৳{m.cost_bdt.toLocaleString()}</td>
                  <td className={`text-right font-mono tnum font-bold ${m.value_bdt >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                    ৳{m.value_bdt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
