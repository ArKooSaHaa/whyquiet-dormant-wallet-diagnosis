import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
  Cell,
} from "recharts";
import { loadSeed, type SeedBundle, type Wallet as WalletType, type Cause } from "./seed";
import { Card, Chip, Button, Skeleton, ErrorState, EmptyState } from "./design/ui";

const CAUSE_LABELS: Record<Cause, string> = {
  job_exit: "Job Exit",
  migration: "Migration",
  solved_problem: "Solved Problem",
  fee_shock: "Fee Shock",
  supply_failure: "Supply Failure",
};

interface TooltipPayloadItem {
  value?: number;
  dataKey?: string;
  name?: string;
  color?: string;
  payload?: any;
}

function CustomChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-2)] text-xs space-y-1">
      <div className="font-semibold text-[var(--text)]">Week {label}</div>
      {data && (
        <>
          <div className="text-[var(--accent)] font-mono tnum">
            Txn Count: <span className="font-bold">{data.txn_count}</span>
          </div>
          <div className="text-[var(--text-muted)] font-mono tnum">
            Volume: ৳{data.amount_bdt?.toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}

export default function Wallet({
  walletId,
  onBack,
}: {
  walletId: string;
  onBack?: () => void;
}) {
  const [bundle, setBundle] = useState<SeedBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBundle = () => {
    loadSeed()
      .then((data) => {
        setBundle(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load wallet diagnosis.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBundle();
  }, [walletId]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = "#/";
    }
  };

  const wallet: WalletType | undefined = useMemo(() => {
    if (!bundle) return undefined;
    return bundle.wallets.find((w) => w.wallet_id === walletId);
  }, [bundle, walletId]);

  // Posterior chart data
  const posteriorData = useMemo(() => {
    if (!wallet) return [];
    return (Object.keys(wallet.posterior) as Cause[]).map((c) => ({
      cause: c,
      label: CAUSE_LABELS[c],
      prob: Number((wallet.posterior[c] * 100).toFixed(1)),
      isTop: wallet.cause === c || (wallet.verdict === "refused" && wallet.posterior[c] === Math.max(...Object.values(wallet.posterior))),
    }));
  }, [wallet]);

  // Feature contributions chart data
  const contributionData = useMemo(() => {
    if (!wallet) return [];
    return wallet.contributions.map((c) => ({
      feature: c.feature.replace(/_/g, " "),
      rawFeature: c.feature,
      value: c.value,
      contribution: Number(c.contribution.toFixed(3)),
    }));
  }, [wallet]);

  /* ------------------- STATE 1: LOADING STATE ------------------- */
  if (loading) {
    return (
      <div className="space-y-6" data-testid="wallet-loading">
        <div className="flex items-center justify-between">
          <Skeleton w={160} h={36} />
          <Skeleton w={100} h={36} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2">
            <Skeleton w={200} h={20} className="mb-4" />
            <Skeleton w="100%" h={220} />
          </Card>
          <Card className="p-6">
            <Skeleton w={160} h={20} className="mb-4" />
            <Skeleton w="100%" h={220} />
          </Card>
        </div>
        <Card className="p-6">
          <Skeleton w={220} h={20} className="mb-4" />
          <Skeleton w="100%" h={180} />
        </Card>
      </div>
    );
  }

  /* ------------------- STATE 2: ERROR STATE ------------------- */
  if (error || !bundle) {
    return (
      <div className="py-8" data-testid="wallet-error">
        <ErrorState
          title="Wallet Diagnosis Unavailable"
          body={error || "Could not retrieve wallet diagnosis data."}
          onRetry={fetchBundle}
          testid="wallet-retry-btn"
        />
      </div>
    );
  }

  /* ------------------- STATE 3: EMPTY STATE (NOT FOUND) ------------------- */
  if (!wallet) {
    return (
      <div className="py-8" data-testid="wallet-empty">
        <EmptyState
          title="Wallet Not Found"
          body={`Wallet ${walletId} does not exist in the active cohort.`}
          action={
            <Button variant="secondary" size="sm" onClick={handleBack} data-testid="back-to-queue-btn">
              Return to Triage Queue
            </Button>
          }
          testid="wallet-not-found-state"
        />
      </div>
    );
  }

  /* ------------------- STATE 4: SUCCESS STATE ------------------- */
  const isAttributed = wallet.verdict === "attributed";
  const remedy = wallet.cause ? bundle.remedies[wallet.cause] : null;
  const tau = bundle.meta.tau;
  const tauPct = tau * 100;
  const seriesLen = wallet.series.length;
  const silenceStartWeek = Math.max(1, seriesLen - wallet.weeks_silent + 1);

  return (
    <div className="space-y-6" data-testid="wallet-view">
      {/* Header & Meta Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handleBack} data-testid="back-button" className="h-[36px]">
            ← Queue
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="t-2xl font-bold font-mono text-[var(--accent)]" data-testid="wallet-id-header">
                {wallet.wallet_id}
              </h1>
              <Chip tone={isAttributed ? "accent" : "neutral"} data-testid="wallet-verdict-chip">
                {isAttributed ? "Attributed" : "Refused"}
              </Chip>
            </div>
            <p className="t-xs text-[var(--text-muted)] mt-0.5">
              Worker: <span className="capitalize text-[var(--text)] font-medium">{wallet.worker_type}</span> ·
              Pay Cycle: <span className="capitalize text-[var(--text)] font-medium">{wallet.pay_cycle}</span> ·
              Inactive: <span className="text-[var(--text)] font-medium">{wallet.weeks_silent} weeks</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAttributed && (
            <a href="#/batches" className="text-decoration-none">
              <Button variant="primary" size="sm" className="h-[36px] text-xs">
                Propose in Batch →
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Rule vs Model Comparison Card */}
      <Card className="p-4 sm:p-5" data-testid="rule-vs-model-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Decision Comparison
            </div>
            <h2 className="t-md font-bold text-[var(--text)] mt-0.5">What the Rule Would Do vs. Cause Desk</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="p-2.5 px-3.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)]">
              <span className="text-[var(--text-faint)]">Rule Heuristic: </span>
              <span className="font-semibold text-[var(--warning)]">
                {wallet.rule_baseline.action === "message_everyone" ? "Message Everyone (Blanket Push)" : "No Action"}
              </span>
            </div>
            <div className="p-2.5 px-3.5 rounded-[var(--radius-sm)] bg-[var(--accent-soft)] border border-[var(--accent)]/30">
              <span className="text-[var(--accent-fg)] dark:text-[var(--accent)]">Model Verdict: </span>
              <strong className="text-[var(--accent)]">
                {isAttributed && wallet.cause ? `Target ${CAUSE_LABELS[wallet.cause]}` : "Refuse & Save Budget"}
              </strong>
            </div>
          </div>
        </div>
      </Card>

      {/* Attributed Remedy vs Refusal Panel */}
      {isAttributed && remedy ? (
        <Card className="p-6 space-y-4 border-l-4 border-l-[var(--accent)]" data-testid="remedy-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Attributed Remedy
                </span>
                <Chip tone="warning">ASSUMED</Chip>
              </div>
              <h3 className="t-xl font-bold text-[var(--text)] mt-1" data-testid="remedy-label">
                {remedy.label}
              </h3>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs text-[var(--text-faint)]">Unit Remedy Cost (ASSUMED)</div>
              <div className="t-xl font-bold font-mono text-[var(--text)]">৳{remedy.unit_cost_bdt}</div>
            </div>
          </div>

          {/* Bilingual Message Preview */}
          <div className="p-4 rounded-[var(--radius)] bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
            <div className="text-xs font-semibold text-[var(--text-muted)]">
              Targeted Reactivation Copy (Bilingual Preview)
            </div>
            <div>
              <div className="text-[11px] font-mono text-[var(--text-faint)]">English:</div>
              <div className="text-sm text-[var(--text)] font-medium mt-0.5" data-testid="remedy-msg-en">
                {remedy.message_en}
              </div>
            </div>
            <div className="pt-2 border-t border-[var(--border)]/60">
              <div className="text-[11px] font-mono text-[var(--text-faint)]">বাংলা (Bangla):</div>
              <div className="text-sm text-[var(--text)] font-medium mt-0.5" data-testid="remedy-msg-bn">
                {remedy.message_bn}
              </div>
            </div>
          </div>

          <div className="text-xs text-[var(--text-faint)] flex items-center justify-between">
            <span>Remedy Code: <code className="font-mono text-[var(--text)] font-semibold">{remedy.remedy_code}</code></span>
            <span>Refusal check passed: Max posterior &ge; {tau} &amp; top-2 margin &ge; {bundle.meta.delta}</span>
          </div>
        </Card>
      ) : (
        /* Dedicated Refusal Screen (The Money Shot) */
        <Card className="p-8 text-center space-y-5 border-l-4 border-l-[var(--text-muted)]" data-testid="refusal-panel">
          <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] mx-auto grid place-items-center shadow-[var(--shadow-1)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <div>
            <h2 className="t-2xl font-bold text-[var(--text)]" data-testid="refusal-headline">
              No attributable cause. I will not spend your money here.
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl mx-auto mt-2">
              The transaction decline shape for this wallet does not meet our strict calibration thresholds (τ={tau}, δ={bundle.meta.delta}).
              Sending uncalibrated generic messages will waste budget and risk driving user opt-outs.
            </p>
          </div>

          {/* Refusal Reasons List */}
          <div className="max-w-lg mx-auto p-4 rounded-[var(--radius)] bg-[var(--surface-2)] border border-[var(--border)] text-left space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              Calibrated Refusal Reasons
            </div>
            <ul className="space-y-1.5 text-xs text-[var(--text)]" data-testid="refusal-reasons-list">
              {wallet.refusal_reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--accent)] font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Note: No action buttons rendered for refused wallets as per spec */}
        </Card>
      )}

      {/* Decline Shape Chart & Posterior Distribution Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Decline Shape Area Chart */}
        <Card className="p-5 sm:p-6 space-y-3" data-testid="decline-shape-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="t-md font-semibold text-[var(--text)]">26-Week Transaction Decline Shape</h3>
              <p className="t-xs text-[var(--text-muted)]">
                Weekly transaction frequency with {wallet.weeks_silent}-week inactivity window shaded
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--accent)] tnum">{wallet.series.length} wks</span>
          </div>

          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wallet.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="txnGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--text-faint)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomChartTooltip />} />
                {/* Silence Window Shading */}
                <ReferenceArea
                  x1={silenceStartWeek}
                  x2={seriesLen}
                  strokeOpacity={0.3}
                  fill="var(--danger-soft)"
                  fillOpacity={0.25}
                  label={{ value: "Inactive Window", fill: "var(--danger)", fontSize: 10, position: "insideTopRight" }}
                />
                <Area
                  type="monotone"
                  dataKey="txn_count"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#txnGradient)"
                  name="Transactions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 2. Posterior Distribution Bar Chart */}
        <Card className="p-5 sm:p-6 space-y-3" data-testid="posterior-chart-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="t-md font-semibold text-[var(--text)]">Posterior Distribution (5 Causes)</h3>
              <p className="t-xs text-[var(--text-muted)]">
                Calibrated probability per churn hypothesis with threshold line τ={tau}
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--text-faint)]">τ = {tau}</span>
          </div>

          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={posteriorData} layout="vertical" margin={{ top: 10, right: 25, left: 35, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="var(--text-faint)" fontSize={11} unit="%" />
                <YAxis dataKey="label" type="category" stroke="var(--text-muted)" fontSize={11} width={80} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Posterior"]}
                  contentStyle={{ background: "var(--surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
                />
                <ReferenceLine x={tauPct} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: `τ (${tauPct}%)`, fill: "var(--warning)", fontSize: 10, position: "top" }} />
                <Bar dataKey="prob" radius={[0, 8, 8, 0]}>
                  {posteriorData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isTop ? (isAttributed ? "var(--accent)" : "var(--text-muted)") : "var(--surface-3)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Feature Contributions Section */}
      <Card className="p-5 sm:p-6 space-y-4" data-testid="contributions-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="t-md font-semibold text-[var(--text)]">Decline Feature Attributions (SHAP Contributions)</h3>
            <p className="t-xs text-[var(--text-muted)]">
              Feature values and signed push toward predicted cause hypothesis
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--text-faint)]">Top {contributionData.length} features</span>
        </div>

        <div className="w-full h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={contributionData} layout="vertical" margin={{ top: 5, right: 30, left: 90, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-faint)" fontSize={11} />
              <YAxis dataKey="feature" type="category" stroke="var(--text-muted)" fontSize={11} width={130} tickLine={false} />
              <Tooltip
                formatter={(val: any, _name: any, item: any) => [
                  `Contribution: ${val} (Value: ${item.payload.value})`,
                  item.payload.rawFeature,
                ]}
                contentStyle={{ background: "var(--surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
              />
              <ReferenceLine x={0} stroke="var(--border-strong)" />
              <Bar dataKey="contribution" radius={[4, 4, 4, 4]}>
                {contributionData.map((entry, index) => (
                  <Cell
                    key={`contrib-cell-${index}`}
                    fill={entry.contribution >= 0 ? "var(--accent)" : "var(--text-faint)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
