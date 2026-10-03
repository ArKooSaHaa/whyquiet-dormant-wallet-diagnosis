import { useState, useEffect } from "react";
import { Card, Chip, Button, Input, Select, Table, Skeleton, EmptyState, ErrorState, Field } from "./design/ui";
import { loadSeed, type SeedBundle, type Cause } from "./seed";

const CAUSE_LABELS: Record<Cause, string> = {
  job_exit: "Job Exit",
  migration: "Migration",
  solved_problem: "Solved Problem",
  fee_shock: "Fee Shock",
  supply_failure: "Supply Failure",
};

interface BatchItem {
  id: string;
  cause: Cause;
  remedy_code: string;
  unit_cost_bdt: number;
  wallet_count: number;
  status: "proposed" | "approved" | "rejected";
  proposed_by: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export default function BatchesView() {
  const [bundle, setBundle] = useState<SeedBundle | null>(null);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Propose form state
  const [selectedCause, setSelectedCause] = useState<Cause>("job_exit");
  const [proposing, setProposing] = useState(false);
  const [proposeSuccess, setProposeSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const seedData = await loadSeed();
        if (!active) return;
        setBundle(seedData);

        const res = await fetch("/api/batches").catch(() => null);
        if (!active) return;
        if (res && res.ok) {
          const data = await res.json();
          setBatches(data);
          setOffline(false);
        } else {
          setOffline(true);
          setBatches([
            {
              id: "BATCH-8910",
              cause: "job_exit",
              remedy_code: "REM-JOB-01",
              unit_cost_bdt: 12,
              wallet_count: 142,
              status: "proposed",
              proposed_by: "analyst@whyquiet.demo",
              decided_by: null,
              decided_at: null,
              decision_note: null,
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: "BATCH-8909",
              cause: "fee_shock",
              remedy_code: "REM-FEE-01",
              unit_cost_bdt: 25,
              wallet_count: 84,
              status: "approved",
              proposed_by: "analyst@whyquiet.demo",
              decided_by: "approver@whyquiet.demo",
              decided_at: new Date(Date.now() - 7200000).toISOString(),
              decision_note: "Approved for Friday SMS push.",
              created_at: new Date(Date.now() - 10800000).toISOString(),
            },
          ]);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load batches.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handlePropose = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setProposeSuccess(null);

    if (!selectedCause) {
      setFormError("Please select a cause to propose.");
      return;
    }

    setProposing(true);
    setTimeout(() => {
      const matchingCount = bundle?.wallets.filter((w) => w.cause === selectedCause).length ?? 12;
      const remedy = bundle?.remedies[selectedCause];
      const newBatch: BatchItem = {
        id: `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
        cause: selectedCause,
        remedy_code: remedy?.remedy_code ?? "REM-01",
        unit_cost_bdt: remedy?.unit_cost_bdt ?? 10,
        wallet_count: matchingCount,
        status: "proposed",
        proposed_by: "analyst@whyquiet.demo",
        decided_by: null,
        decided_at: null,
        decision_note: null,
        created_at: new Date().toISOString(),
      };
      setBatches([newBatch, ...batches]);
      setProposing(false);
      setProposeSuccess(`Batch ${newBatch.id} successfully created with ${matchingCount} wallets.`);
    }, 600);
  };

  /* 1. Loading State */
  if (loading) {
    return (
      <div className="space-y-6" data-testid="batches-loading">
        <Skeleton w={200} h={32} />
        <Card className="p-6">
          <Skeleton w="100%" h={120} />
        </Card>
        <Card className="p-6">
          <Skeleton w="100%" h={200} />
        </Card>
      </div>
    );
  }

  /* 2. Error State */
  if (error) {
    return (
      <div className="py-8" data-testid="batches-error">
        <ErrorState
          title="Batches System Error"
          body={error}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    );
  }

  const remedy = bundle?.remedies[selectedCause];
  const eligibleWalletsCount = bundle?.wallets.filter((w) => w.verdict === "attributed" && w.cause === selectedCause).length ?? 0;
  const estimatedTotalCost = eligibleWalletsCount * (remedy?.unit_cost_bdt ?? 0);

  return (
    <div className="space-y-6" data-testid="batches-view">
      {offline && (
        <div className="p-3 rounded-[var(--radius-sm)] text-xs flex items-center justify-between" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
          <span>Write path offline / standby. Propose preview and simulation available.</span>
          <Chip tone="warning">Standby</Chip>
        </div>
      )}

      {/* Propose Campaign Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="t-lg font-bold text-[var(--text)]">Propose Cause-Targeted Batch</h2>
            <p className="t-xs text-[var(--text-muted)] mt-0.5">
              Select an attributed cause group to bundle eligible wallets for approver sign-off.
            </p>
          </div>
          <Chip tone="accent">Analyst Role</Chip>
        </div>

        <form onSubmit={handlePropose} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Attributed Cause Group" id="batch-cause-select" error={formError || undefined}>
              <Select
                id="batch-cause-select"
                value={selectedCause}
                onChange={(e) => setSelectedCause(e.target.value as Cause)}
                className="w-full"
              >
                <option value="job_exit">Job Exit (Payroll Lapse)</option>
                <option value="migration">Migration (Location Shift)</option>
                <option value="solved_problem">Solved Problem (P2P Cessation)</option>
                <option value="fee_shock">Fee Shock (Cashout Bounce)</option>
                <option value="supply_failure">Supply Failure (Agent Outage)</option>
              </Select>
            </Field>

            <Field label="Target Wallets (Cohort)" id="batch-wallets-count">
              <Input
                id="batch-wallets-count"
                value={`${eligibleWalletsCount} wallets attributed`}
                readOnly
                disabled
              />
            </Field>

            <Field label="Estimated Cost (ASSUMED)" id="batch-est-cost">
              <Input
                id="batch-est-cost"
                value={`৳${estimatedTotalCost} (৳${remedy?.unit_cost_bdt ?? 0} / wallet)`}
                readOnly
                disabled
              />
            </Field>
          </div>

          {remedy && (
            <div className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-xs space-y-1.5">
              <div className="font-semibold text-[var(--text)]">Remedy Preview: {remedy.label}</div>
              <div className="text-[var(--text-muted)]">{remedy.message_en}</div>
              <div className="text-[var(--text-faint)] italic">{remedy.message_bn}</div>
            </div>
          )}

          {proposeSuccess && (
            <div className="p-3 rounded-[var(--radius-sm)] text-xs bg-[var(--success-soft)] text-[var(--success)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>{proposeSuccess}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={proposing}
              disabled={proposing || eligibleWalletsCount === 0}
              data-testid="propose-batch-btn"
            >
              Propose Remedy Batch
            </Button>
          </div>
        </form>
      </Card>

      {/* Batches Table */}
      <div className="space-y-3">
        <h3 className="t-md font-semibold text-[var(--text)]">Batch Audit & Governance Log</h3>
        {batches.length === 0 ? (
          /* 3. Empty State */
          <EmptyState
            title="No Batches Created"
            body="No remedy campaign batches have been proposed yet."
            testid="batches-empty-state"
          />
        ) : (
          /* 4. Success State */
          <Table testid="batches-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Target Cause</th>
                <th>Wallets</th>
                <th>Unit Cost</th>
                <th>Status</th>
                <th>Proposer</th>
                <th>Decision Note</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-[var(--accent)] font-medium">{b.id}</td>
                  <td className="font-medium text-[var(--text)]">{CAUSE_LABELS[b.cause]}</td>
                  <td className="font-mono tnum text-[var(--text)]">{b.wallet_count}</td>
                  <td className="font-mono tnum text-[var(--text)]">৳{b.unit_cost_bdt}</td>
                  <td>
                    <Chip tone={b.status === "approved" ? "success" : b.status === "rejected" ? "danger" : "warning"}>
                      {b.status}
                    </Chip>
                  </td>
                  <td className="text-xs text-[var(--text-muted)] font-mono">{b.proposed_by}</td>
                  <td className="text-xs text-[var(--text-faint)]">
                    {b.decision_note || (b.status === "proposed" ? "Pending approver sign-off" : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
