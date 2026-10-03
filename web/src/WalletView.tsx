import { useState, useEffect } from "react";
import { loadSeed, type SeedBundle, type Wallet, type Cause } from "./seed";
import { Card, Chip, Button, Skeleton, ErrorState, EmptyState } from "./design/ui";

const CAUSE_LABELS: Record<Cause, string> = {
  job_exit: "Job Exit",
  migration: "Migration",
  solved_problem: "Solved Problem",
  fee_shock: "Fee Shock",
  supply_failure: "Supply Failure",
};

export default function WalletView({
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
        setError(err instanceof Error ? err.message : "Failed to load wallet data.");
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

  /* 1. Loading State */
  if (loading) {
    return (
      <div className="space-y-6" data-testid="wallet-loading">
        <div className="flex items-center justify-between">
          <Skeleton w={140} h={32} />
          <Skeleton w={90} h={36} />
        </div>
        <Card className="p-6">
          <Skeleton w={200} h={24} className="mb-4" />
          <Skeleton w="100%" h={180} />
        </Card>
      </div>
    );
  }

  /* 2. Error State */
  if (error || !bundle) {
    return (
      <div className="py-8" data-testid="wallet-error">
        <ErrorState
          title="Error Loading Wallet"
          body={error || "Could not retrieve wallet diagnosis."}
          onRetry={fetchBundle}
        />
      </div>
    );
  }

  const wallet: Wallet | undefined = bundle.wallets.find((w) => w.wallet_id === walletId);

  /* 3. Empty State / Not Found */
  if (!wallet) {
    return (
      <div className="py-8" data-testid="wallet-empty">
        <EmptyState
          title="Wallet Not Found"
          body={`Wallet ${walletId} does not exist in the active population cohort.`}
          action={
            <Button variant="secondary" size="sm" onClick={handleBack} data-testid="back-to-queue-btn">
              Return to Triage Queue
            </Button>
          }
        />
      </div>
    );
  }

  /* 4. Success State */
  const isAttributed = wallet.verdict === "attributed";
  const remedy = wallet.cause ? bundle.remedies[wallet.cause] : null;

  return (
    <div className="space-y-6" data-testid="wallet-view">
      {/* Top breadcrumb & ID header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handleBack} data-testid="back-button">
            ← Queue
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="t-2xl font-bold font-mono text-[var(--accent)]">{wallet.wallet_id}</h1>
              <Chip tone={isAttributed ? "accent" : "neutral"}>
                {isAttributed ? "Attributed" : "Refused"}
              </Chip>
            </div>
            <p className="t-xs text-[var(--text-muted)] mt-0.5">
              Sector: <span className="capitalize text-[var(--text)] font-medium">{wallet.worker_type}</span> ·
              Pay cycle: <span className="capitalize text-[var(--text)] font-medium">{wallet.pay_cycle}</span> ·
              Silent: <span className="text-[var(--text)] font-medium">{wallet.weeks_silent} weeks</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-faint)]">Rule baseline:</span>
          <Chip tone="neutral">
            {wallet.rule_baseline.action === "message_everyone" ? "Message Everyone" : "No Action"}
          </Chip>
        </div>
      </div>

      {/* Main Diagnosis Content */}
      {isAttributed && remedy ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Remedy Card */}
          <Card className="p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Diagnosed Remedy
                </span>
                <h2 className="t-xl font-bold text-[var(--text)] mt-1">{remedy.label}</h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--text-faint)]">Unit Cost (ASSUMED)</span>
                <div className="t-lg font-bold font-mono text-[var(--text)]">৳{remedy.unit_cost_bdt}</div>
              </div>
            </div>

            {/* Message Preview */}
            <div className="p-4 rounded-[var(--radius)] bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
              <div className="text-xs font-semibold text-[var(--text-muted)]">Targeted Message Preview (Bilingual)</div>
              <div>
                <div className="text-xs font-mono text-[var(--text-faint)]">English:</div>
                <div className="text-sm text-[var(--text)] mt-0.5">{remedy.message_en}</div>
              </div>
              <div className="pt-2 border-t border-[var(--border)]/50">
                <div className="text-xs font-mono text-[var(--text-faint)]">বাংলা (Bangla):</div>
                <div className="text-sm text-[var(--text)] mt-0.5">{remedy.message_bn}</div>
              </div>
            </div>

            <div className="text-xs text-[var(--text-faint)]">
              Remedy Code: <code className="font-mono text-[var(--text)]">{remedy.remedy_code}</code>
            </div>
          </Card>

          {/* Posterior Distribution Preview */}
          <Card className="p-6 space-y-3">
            <h3 className="t-md font-semibold text-[var(--text)]">Posterior Confidence</h3>
            <div className="space-y-2.5">
              {(Object.keys(wallet.posterior) as Cause[]).map((c) => {
                const prob = wallet.posterior[c];
                const isTop = wallet.cause === c;
                return (
                  <div key={c} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={isTop ? "font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"}>
                        {CAUSE_LABELS[c]}
                      </span>
                      <span className="font-mono tnum text-[var(--text)]">{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-[var(--surface-2)] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(4, prob * 100)}%`,
                          background: isTop ? "var(--accent)" : "var(--text-faint)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      ) : (
        /* Calibrated Refusal Money Shot */
        <Card className="p-8 text-center space-y-4" data-testid="refusal-panel">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] mx-auto grid place-items-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="t-2xl font-bold text-[var(--text)]">
            No attributable cause. I will not spend your money here.
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xl mx-auto">
            This wallet has an ambiguous decline pattern below calibration threshold (τ={bundle.meta.tau}, δ={bundle.meta.delta}).
            Sending uncalibrated reactivation messages wastes marketing budget.
          </p>

          <div className="max-w-md mx-auto p-4 rounded-[var(--radius)] bg-[var(--surface-2)] border border-[var(--border)] text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)] mb-2">
              Refusal Diagnostics
            </div>
            <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
              {wallet.refusal_reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* Feature Contributions */}
      {wallet.contributions.length > 0 && (
        <Card className="p-6 space-y-4">
          <h3 className="t-md font-semibold text-[var(--text)]">Top Contributing Decline Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {wallet.contributions.map((item, idx) => (
              <div key={idx} className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-2)] flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs text-[var(--text)]">{item.feature}</div>
                  <div className="text-[11px] text-[var(--text-faint)]">Value: {item.value}</div>
                </div>
                <div className={`font-mono text-xs font-semibold ${item.contribution > 0 ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                  {item.contribution > 0 ? `+${item.contribution.toFixed(2)}` : item.contribution.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
