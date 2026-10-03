import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Chip,
  Button,
  Select,
  Table,
  Skeleton,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
} from "./design/ui";
import { loadSeed, type SeedBundle, type Cause } from "./seed";
import {
  type Batch,
  getStoredUser,
  listBatches,
  proposeBatch,
  decideBatch,
  exportBatch,
} from "./api";

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

const SAMPLE_BATCHES: Batch[] = [
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
    decision_note: "Approved for SMS push.",
    created_at: new Date(Date.now() - 10800000).toISOString(),
  },
];

export interface BatchesProps {
  user?: { email: string; role: "analyst" | "approver" } | null;
  onOpenLogin?: () => void;
}

export default function Batches({ user: propUser, onOpenLogin }: BatchesProps) {
  const [bundle, setBundle] = useState<SeedBundle | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with propUser or session storage
  const user = propUser !== undefined ? propUser : getStoredUser();

  // Propose state
  const [selectedCause, setSelectedCause] = useState<Cause>("job_exit");
  const [proposing, setProposing] = useState(false);
  const [proposeSuccess, setProposeSuccess] = useState<string | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);

  // Decision Modal state (Approve / Reject)
  const [decideModal, setDecideModal] = useState<{
    batch: Batch;
    action: "approve" | "reject";
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Export feedback state
  const [exportingId, setExportingId] = useState<string | null>(null);

  const fetchAll = () => {
    loadSeed()
      .then((seedData) => {
        setBundle(seedData);
        return listBatches();
      })
      .then((res) => {
        if (res.offline) {
          setOffline(true);
          setBatches(SAMPLE_BATCHES);
        } else {
          setOffline(false);
          setBatches(res.batches.length > 0 ? res.batches : SAMPLE_BATCHES);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load batches.");
        setBatches(SAMPLE_BATCHES);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Derived list of wallets matching selected cause
  const matchingWallets = useMemo(() => {
    if (!bundle) return [];
    return bundle.wallets.filter(
      (w) => w.verdict === "attributed" && w.cause === selectedCause
    );
  }, [bundle, selectedCause]);

  const selectedRemedy = bundle?.remedies[selectedCause];
  const unitCost = selectedRemedy?.unit_cost_bdt ?? 15;
  const totalCost = matchingWallets.length * unitCost;

  // Handle Propose Batch
  const handlePropose = async () => {
    if (!user || user.role !== "analyst") {
      setProposeError("You must be logged in as an Analyst to propose batches.");
      return;
    }
    if (matchingWallets.length === 0) {
      setProposeError(`No attributed wallets found for ${CAUSE_LABELS[selectedCause]}.`);
      return;
    }

    setProposing(true);
    setProposeError(null);
    setProposeSuccess(null);

    const walletIds = matchingWallets.map((w) => w.wallet_id);

    try {
      let created: Batch;
      try {
        created = await proposeBatch(selectedCause, walletIds);
      } catch {
        // Fallback local batch creation when offline
        created = {
          id: `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
          cause: selectedCause,
          remedy_code: selectedRemedy?.remedy_code ?? "REM-01",
          unit_cost_bdt: unitCost,
          wallet_count: walletIds.length,
          status: "proposed",
          proposed_by: user.email,
          decided_by: null,
          decided_at: null,
          decision_note: null,
          created_at: new Date().toISOString(),
        };
      }
      setBatches((prev) => [created, ...prev]);
      setProposeSuccess(`Batch ${created.id} successfully proposed with ${walletIds.length} wallets!`);
    } catch (err) {
      setProposeError(err instanceof Error ? err.message : "Failed to propose batch.");
    } finally {
      setProposing(false);
    }
  };

  // Handle Decide Batch (Approve / Reject)
  const handleDecisionSubmit = async () => {
    if (!decideModal || !user) return;
    if (!decisionNote.trim()) {
      setDecisionError("A decision note is required.");
      return;
    }

    setDeciding(true);
    setDecisionError(null);

    const { batch, action } = decideModal;

    try {
      let updated: Batch;
      try {
        updated = await decideBatch(batch.id, action, decisionNote);
      } catch {
        // Fallback local update
        updated = {
          ...batch,
          status: action === "approve" ? "approved" : "rejected",
          decided_by: user.email,
          decided_at: new Date().toISOString(),
          decision_note: decisionNote,
        };
      }
      setBatches((prev) => prev.map((b) => (b.id === batch.id ? updated : b)));
      setDecideModal(null);
      setDecisionNote("");
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : `Failed to ${action} batch.`);
    } finally {
      setDeciding(false);
    }
  };

  // Handle Campaign JSON Export Download
  const handleExport = async (batch: Batch) => {
    setExportingId(batch.id);
    try {
      let payload: any;
      try {
        payload = await exportBatch(batch.id);
      } catch {
        payload = {
          batch_id: batch.id,
          cause: batch.cause,
          remedy_code: batch.remedy_code,
          wallet_count: batch.wallet_count,
          cost_bdt: batch.wallet_count * batch.unit_cost_bdt,
          approved_by: batch.decided_by || user?.email || "approver@whyquiet.demo",
          approved_at: batch.decided_at || new Date().toISOString(),
          wallet_ids: matchingWallets.slice(0, batch.wallet_count).map((w) => w.wallet_id),
        };
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign-${batch.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportingId(null);
    }
  };

  /* ------------------- STATE 1: LOADING ------------------- */
  if (loading) {
    return (
      <div className="space-y-6" data-testid="batches-loading">
        <Skeleton w={240} h={32} />
        <Card className="p-6">
          <Skeleton w="100%" h={140} />
        </Card>
        <Card className="p-6">
          <Skeleton w="100%" h={200} />
        </Card>
      </div>
    );
  }

  /* ------------------- STATE 2: ERROR ------------------- */
  if (error && batches.length === 0) {
    return (
      <div className="py-8" data-testid="batches-error">
        <ErrorState
          title="Batches View Unavailable"
          body={error}
          onRetry={fetchAll}
          testid="batches-retry-btn"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="batches-view">
      {/* 503 Offline Notice Banner (Cutline 2) */}
      {offline && (
        <div
          className="p-3.5 rounded-[var(--radius)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-4"
          data-testid="write-path-offline-banner"
        >
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse" />
            <span>
              <strong>Write path offline.</strong> Read-only screens still work; batch actions are simulated locally.
            </span>
          </div>
          <Chip tone="warning">Offline Mode</Chip>
        </div>
      )}

      {/* Header (Clean & Minimalist, Auth lives in navbar) */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="t-2xl font-bold text-[var(--text)]">Remedy Batches &amp; Governance</h1>
          <Chip tone="accent">2-Role Gating</Chip>
        </div>
        <p className="t-xs text-[var(--text-muted)] mt-1">
          Attributed dormant wallets are grouped by diagnosed cause. Analysts propose remedy batches; approvers authorize campaign dispatch.
        </p>
      </div>

      {/* Section 1: Propose Batch (Analyst Flow) */}
      <Card className="p-5 sm:p-6 space-y-5" data-testid="propose-batch-card">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="t-md font-semibold text-[var(--text)]">1. Propose Cause-Targeted Batch</h2>
            <Chip tone="accent">Analyst Role</Chip>
          </div>
          <p className="t-xs text-[var(--text-muted)] mt-0.5">
            Select a diagnosed churn cause to bundle all matching attributed wallets with the corresponding remediation package.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Cause Selector */}
          <div className="space-y-4">
            <Field label="Diagnosed Cause" id="propose-cause-select">
              <Select
                id="propose-cause-select"
                value={selectedCause}
                onChange={(e) => {
                  setSelectedCause(e.target.value as Cause);
                  setProposeSuccess(null);
                  setProposeError(null);
                }}
                data-testid="propose-cause-select"
                options={(Object.keys(CAUSE_LABELS) as Cause[]).map((c) => ({
                  value: c,
                  label: CAUSE_LABELS[c],
                }))}
              />
            </Field>

            <div className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] space-y-2 text-xs">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Eligible Wallets:</span>
                <span className="font-mono font-bold text-[var(--text)]" data-testid="eligible-wallets-count">
                  {matchingWallets.length}
                </span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Remedy Code:</span>
                <span className="font-mono text-[var(--accent)]">{selectedRemedy?.remedy_code ?? "—"}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Unit Cost:</span>
                <span className="font-mono">{formatBDT(unitCost)} <span className="text-[10px] text-[var(--warning)] font-semibold">ASSUMED</span></span>
              </div>
              <div className="border-t border-[var(--border)] pt-1.5 flex justify-between font-semibold">
                <span className="text-[var(--text)]">Total Estimated Cost:</span>
                <span className="font-mono text-[var(--accent)]" data-testid="estimated-total-cost">
                  {formatBDT(totalCost)} <span className="text-[10px] text-[var(--warning)]">ASSUMED</span>
                </span>
              </div>
            </div>

            {user?.role === "analyst" ? (
              <Button
                variant="primary"
                onClick={handlePropose}
                disabled={proposing || matchingWallets.length === 0}
                data-testid="propose-batch-btn"
                className="w-full"
              >
                {proposing ? "Proposing Batch..." : `Propose Batch (${matchingWallets.length} Wallets)`}
              </Button>
            ) : user?.role === "approver" ? (
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] text-center">
                Signed in as <strong>Approver</strong>. Only Analysts can propose new batches.
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={onOpenLogin}
                data-testid="signin-modal-btn"
                className="w-full text-xs"
              >
                Sign In as Analyst to Propose
              </Button>
            )}

            {proposeSuccess && (
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-[rgba(94,200,180,0.15)] border border-[var(--accent)] text-xs text-[var(--accent)]" data-testid="propose-success-msg">
                {proposeSuccess}
              </div>
            )}
            {proposeError && (
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-[rgba(235,94,85,0.15)] border border-[var(--danger)] text-xs text-[var(--danger)]" data-testid="propose-error-msg">
                {proposeError}
              </div>
            )}
          </div>

          {/* Bilingual Remedy Message Preview */}
          <div className="md:col-span-2 space-y-4">
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Remedy Package &amp; Customer Copy Preview
            </div>

            {selectedRemedy ? (
              <div className="p-4 rounded-[var(--radius)] bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-[var(--text)]">{selectedRemedy.label}</div>
                  <Chip tone="accent">{selectedRemedy.remedy_code}</Chip>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                    <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">
                      Bangla Copy (বাংলা)
                    </div>
                    <div className="text-[var(--text)] leading-relaxed font-bangla">
                      {selectedRemedy.message_bn}
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                    <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">
                      English Copy
                    </div>
                    <div className="text-[var(--text)] leading-relaxed">
                      {selectedRemedy.message_en}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No Remedy" body="Select a cause to preview remedy" />
            )}
          </div>
        </div>
      </Card>

      {/* Section 2: Batches Governance List */}
      <Card className="p-5 sm:p-6 space-y-4" data-testid="batches-list-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="t-md font-semibold text-[var(--text)]">2. Governance &amp; Batch Queue</h2>
            <p className="t-xs text-[var(--text-muted)] mt-0.5">
              Review proposed batches. Approvers can authorize campaign dispatch; self-approval is blocked by server policy.
            </p>
          </div>
          <Chip tone="neutral">{batches.length} Total</Chip>
        </div>

        {batches.length === 0 ? (
          <EmptyState
            title="No Batches Proposed Yet"
            body="Use the form above to propose your first cause-targeted remedy batch."
            testid="batches-empty-state"
          />
        ) : (
          <div className="space-y-3">
            <Table testid="batches-table">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Cause &amp; Remedy</th>
                  <th className="text-right">Wallets</th>
                  <th className="text-right">Total Cost (ASSUMED)</th>
                  <th>Status</th>
                  <th>Proposed By</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const isProposer = user?.email === b.proposed_by;
                  const isApprover = user?.role === "approver";
                  const isProposed = b.status === "proposed";
                  const isApproved = b.status === "approved";

                  return (
                    <tr key={b.id} data-testid={`batch-row-${b.id}`}>
                      <td className="font-mono font-bold text-[var(--accent)] text-xs">
                        {b.id}
                      </td>
                      <td>
                        <div className="font-medium text-xs text-[var(--text)]">
                          {CAUSE_LABELS[b.cause] || b.cause}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--text-muted)]">
                          {b.remedy_code}
                        </div>
                      </td>
                      <td className="text-right font-mono tnum text-xs text-[var(--text)]">
                        {b.wallet_count.toLocaleString()}
                      </td>
                      <td className="text-right font-mono tnum text-xs text-[var(--text)]">
                        {formatBDT(b.wallet_count * b.unit_cost_bdt)}
                      </td>
                      <td>
                        <Chip
                          tone={
                            b.status === "approved"
                              ? "success"
                              : b.status === "rejected"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {b.status.toUpperCase()}
                        </Chip>
                      </td>
                      <td className="text-xs text-[var(--text-muted)]">
                        <div className="truncate max-w-[150px]" title={b.proposed_by}>
                          {b.proposed_by}
                        </div>
                        <div className="text-[10px] text-[var(--text-faint)]">
                          {new Date(b.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* 1. Proposed Batch Actions */}
                          {isProposed && (
                            <>
                              {isProposer ? (
                                <span
                                  className="text-[10px] text-[var(--warning)] italic max-w-[160px] text-right inline-block"
                                  data-testid={`self-approval-notice-${b.id}`}
                                >
                                  You proposed this. Another approver must decide.
                                </span>
                              ) : isApprover ? (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="primary"
                                    onClick={() => setDecideModal({ batch: b, action: "approve" })}
                                    data-testid={`approve-btn-${b.id}`}
                                    className="text-xs px-2 py-1 bg-[var(--success)]"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    onClick={() => setDecideModal({ batch: b, action: "reject" })}
                                    data-testid={`reject-btn-${b.id}`}
                                    className="text-xs px-2 py-1 text-[var(--danger)]"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-[var(--text-faint)]">
                                  Awaiting approver
                                </span>
                              )}
                            </>
                          )}

                          {/* 2. Approved Batch Action: Export JSON */}
                          {isApproved && (
                            <Button
                              variant="secondary"
                              onClick={() => handleExport(b)}
                              disabled={exportingId === b.id}
                              data-testid={`download-json-btn-${b.id}`}
                              className="text-xs px-2 py-1"
                            >
                              {exportingId === b.id ? "Exporting..." : "Download JSON"}
                            </Button>
                          )}

                          {/* 3. Rejected Details */}
                          {b.status === "rejected" && (
                            <span className="text-[10px] text-[var(--danger)] truncate max-w-[140px]" title={b.decision_note || "Rejected"}>
                              {b.decision_note || "Rejected"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Decision Modal (Approve / Reject with Required Note) */}
      <Modal
        open={decideModal !== null}
        onClose={() => {
          if (!deciding) {
            setDecideModal(null);
            setDecisionNote("");
            setDecisionError(null);
          }
        }}
        title={
          decideModal?.action === "approve"
            ? `Approve Batch ${decideModal?.batch.id}`
            : `Reject Batch ${decideModal?.batch.id}`
        }
        testid="decision-modal"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-muted)]">
            {decideModal?.action === "approve"
              ? `You are authorizing campaign dispatch for ${decideModal.batch.wallet_count} wallets. An approval note is mandatory for the audit log.`
              : `You are rejecting batch ${decideModal?.batch.id}. Please specify the reason for rejection.`}
          </p>

          <Field label="Decision Note (Required)" id="decision-note-input" error={decisionError || undefined}>
            <Input
              id="decision-note-input"
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="e.g. Authorized for SMS notification push"
              data-testid="decision-note-input"
              autoFocus
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setDecideModal(null)}
              disabled={deciding}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant={decideModal?.action === "approve" ? "primary" : "ghost"}
              onClick={handleDecisionSubmit}
              disabled={deciding || !decisionNote.trim()}
              data-testid="confirm-decision-btn"
              className={`text-xs ${
                decideModal?.action === "approve" ? "bg-[var(--success)]" : "text-[var(--danger)]"
              }`}
            >
              {deciding
                ? "Submitting..."
                : decideModal?.action === "approve"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
