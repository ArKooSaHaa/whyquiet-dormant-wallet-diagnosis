import { useState, useEffect, useMemo } from "react";
import { loadSeed, type SeedBundle, type Cause } from "./seed";
import { Card, Chip, Button, Input, Select, Table, Skeleton, EmptyState, ErrorState } from "./design/ui";

const CAUSE_LABELS: Record<Cause, string> = {
  job_exit: "Job Exit",
  migration: "Migration",
  solved_problem: "Solved Problem",
  fee_shock: "Fee Shock",
  supply_failure: "Supply Failure",
};

export default function Queue({ onNavigate }: { onNavigate?: (walletId: string) => void }) {
  const [bundle, setBundle] = useState<SeedBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & search state
  const [verdictFilter, setVerdictFilter] = useState<string>("all");
  const [causeFilter, setCauseFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"confidence_desc" | "weeks_desc" | "id_asc">("confidence_desc");

  // Quick triage lookup form state
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupSuccess, setLookupSuccess] = useState<string | null>(null);

  const fetchSeedData = () => {
    loadSeed()
      .then((data) => {
        setBundle(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load triage queue data.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSeedData();
  }, []);

  // Summary Metrics
  const summary = useMemo(() => {
    if (!bundle) return null;
    const total = bundle.wallets.length;
    const attributed = bundle.wallets.filter((w) => w.verdict === "attributed").length;
    const refused = bundle.wallets.filter((w) => w.verdict === "refused").length;
    const refusalRate = total > 0 ? ((refused / total) * 100).toFixed(1) : "0.0";
    return { total, attributed, refused, refusalRate };
  }, [bundle]);

  // Filtered & Sorted Wallets
  const filteredWallets = useMemo(() => {
    if (!bundle) return [];
    return bundle.wallets
      .filter((w) => {
        if (verdictFilter !== "all" && w.verdict !== verdictFilter) return false;
        if (causeFilter !== "all") {
          if (w.verdict === "refused") return false;
          if (w.cause !== causeFilter) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toUpperCase();
          if (!w.wallet_id.includes(q) && !w.worker_type.toUpperCase().includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "confidence_desc") {
          const confA = a.cause ? a.posterior[a.cause] ?? 0 : Math.max(...Object.values(a.posterior));
          const confB = b.cause ? b.posterior[b.cause] ?? 0 : Math.max(...Object.values(b.posterior));
          return confB - confA;
        }
        if (sortBy === "weeks_desc") {
          return b.weeks_silent - a.weeks_silent;
        }
        return a.wallet_id.localeCompare(b.wallet_id);
      });
  }, [bundle, verdictFilter, causeFilter, searchQuery, sortBy]);

  const handleRowClick = (walletId: string) => {
    if (onNavigate) {
      onNavigate(walletId);
    } else {
      window.location.hash = `#/w/${walletId}`;
    }
  };

  const resetFilters = () => {
    setVerdictFilter("all");
    setCauseFilter("all");
    setSearchQuery("");
    setSortBy("confidence_desc");
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError("");
    setLookupSuccess(null);

    const cleanId = lookupId.trim().toUpperCase();

    // Client-side validation matching server rule
    if (!cleanId) {
      setLookupError("Wallet ID is required.");
      return;
    }
    const walletRegex = /^W-[0-9A-Z]{6}$/;
    if (!walletRegex.test(cleanId)) {
      setLookupError("Wallet ID must follow format W-XXXXXX (e.g. W-7K9A1B).");
      return;
    }

    // The model's output for this sample is seed.json; there is no live triage endpoint (D40).
    const match = bundle?.wallets.find((w) => w.wallet_id === cleanId);
    if (!match) {
      setLookupError(`${cleanId} is not in this sample.`);
      return;
    }
    setLookupSuccess(`Wallet ${cleanId} found (${match.verdict === "attributed" ? CAUSE_LABELS[match.cause!] : "Refused"}). Navigating...`);
    setTimeout(() => handleRowClick(cleanId), 600);
  };

  /* ------------------- STATE 1: LOADING STATE ------------------- */
  if (loading) {
    return (
      <div className="space-y-6" data-testid="queue-loading">
        <h1 className="t-2xl font-bold text-[var(--text)]">Triage Queue</h1>
        {/* Skeleton KPI summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton w={90} h={12} className="mb-3" />
              <Skeleton w={60} h={28} className="mb-2" />
              <Skeleton w={120} h={10} />
            </Card>
          ))}
        </div>

        {/* Skeleton Filter bar */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <Skeleton w="100%" h={40} className="md:w-64" />
            <div className="flex gap-3 w-full md:w-auto">
              <Skeleton w={120} h={40} />
              <Skeleton w={140} h={40} />
              <Skeleton w={130} h={40} />
            </div>
          </div>
        </Card>

        {/* Skeleton Table */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <Skeleton w={180} h={18} />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-4 items-center justify-between py-2 border-b border-[var(--border)]/50 last:border-none">
                <Skeleton w={100} h={16} />
                <Skeleton w={80} h={16} />
                <Skeleton w={70} h={16} />
                <Skeleton w={90} h={22} />
                <Skeleton w={110} h={16} />
                <Skeleton w={50} h={16} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  /* ------------------- STATE 2: ERROR STATE ------------------- */
  if (error || !bundle) {
    return (
      <div className="py-8" data-testid="queue-error">
        <h1 className="t-2xl font-bold text-[var(--text)] mb-6">Triage Queue</h1>
        <ErrorState
          title="Triage Queue Unavailable"
          body={error || "Could not retrieve wallet seed data. Please check network connection or verify offline seed bundle."}
          onRetry={fetchSeedData}
          testid="queue-retry-btn"
        />
      </div>
    );
  }

  /* ------------------- SUCCESS & EMPTY STATES ------------------- */
  return (
    <div className="space-y-6" data-testid="queue-view">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="t-2xl font-bold text-[var(--text)]">Cause Desk</h1>
          <p className="t-xs text-[var(--text-muted)] mt-0.5">
            Triage Queue — Dormant wallet diagnosis and calibrated churn cause attribution console.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="accent">Cohort B Sample</Chip>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <section aria-label="Cohort Summary Metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="summary-cards">
          <Card className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Cohort Wallets
              </div>
              <div className="t-2xl font-bold mt-1 text-[var(--text)] tnum" data-testid="kpi-total">
                {summary?.total ?? 0}
              </div>
            </div>
            <div className="text-xs text-[var(--text-faint)] mt-2">
              Population B sample (τ={bundle.meta.tau}, δ={bundle.meta.delta})
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Attributed
              </div>
              <div className="t-2xl font-bold mt-1 text-[var(--accent)] tnum" data-testid="kpi-attributed">
                {summary?.attributed ?? 0}
              </div>
            </div>
            <div className="text-xs text-[var(--text-faint)] mt-2">
              Diagnosed with actionable cause remedy
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Refused (Ambiguous)
              </div>
              <div className="t-2xl font-bold mt-1 text-[var(--text-muted)] tnum" data-testid="kpi-refused">
                {summary?.refused ?? 0}
              </div>
            </div>
            <div className="text-xs text-[var(--text-faint)] mt-2">
              Calibrated refusal (budget preserved)
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Refusal Rate
              </div>
              <div className="t-2xl font-bold mt-1 text-[var(--text)] tnum" data-testid="kpi-refusal-rate">
                {summary?.refusalRate}%
              </div>
            </div>
            <div className="text-xs text-[var(--text-faint)] mt-2">
              Safety threshold enforcement
            </div>
          </Card>
        </div>
      </section>

      {/* Manual Triage Lookup / Quick Evaluation Form */}
      <Card className="p-4 sm:p-5" data-testid="lookup-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="t-md font-semibold text-[var(--text)]">Quick Wallet Diagnostic</h2>
            <p className="t-xs text-[var(--text-muted)] mt-0.5">
              Look up a wallet in this sample by ID to inspect its decline shape and attribution
            </p>
          </div>

          <form onSubmit={handleLookupSubmit} className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto items-center" noValidate>
            <div className="w-full sm:w-64 relative">
              <label htmlFor="wallet-lookup-input" className="sr-only">
                Wallet ID for quick diagnostic (e.g. W-7K9A1B)
              </label>
              <Input
                id="wallet-lookup-input"
                data-testid="wallet-lookup-input"
                placeholder="e.g. W-7K9A1B"
                value={lookupId}
                onChange={(e) => {
                  setLookupId(e.target.value.toUpperCase());
                  if (lookupError) setLookupError("");
                }}
                mono
                invalid={Boolean(lookupError)}
                aria-invalid={Boolean(lookupError)}
                aria-describedby={lookupError ? "lookup-error-msg" : undefined}
                maxLength={8}
                className="h-[40px] text-xs"
              />
              {lookupError && (
                <span id="lookup-error-msg" className="absolute -bottom-4 left-1 text-[11px] text-[var(--danger)] whitespace-nowrap" role="alert">
                  {lookupError}
                </span>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={!lookupId.trim()}
              data-testid="wallet-lookup-btn"
              className="h-[40px] px-5 text-xs w-full sm:w-auto shrink-0"
            >
              Diagnose
            </Button>
          </form>
        </div>

        {lookupSuccess && (
          <div
            data-testid="lookup-success-msg"
            role="status"
            aria-live="polite"
            className="mt-4 p-2.5 px-3.5 rounded-[var(--radius-sm)] text-xs flex items-center gap-2"
            style={{ background: "var(--success-soft)", color: "var(--success)", border: "1px solid var(--success-soft)" }}
          >
            <span className="w-2 h-2 rounded-full bg-current inline-block" aria-hidden="true" />
            <span>{lookupSuccess}</span>
          </div>
        )}
      </Card>

      {/* Filter and Control Bar */}
      <Card className="p-4">
        <h2 className="sr-only">Queue Filters and Search</h2>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          {/* Search box with inline cross clear button */}
          <div className="w-full lg:w-72 relative flex items-center">
            <label htmlFor="search-wallets" className="sr-only">
              Search wallet ID or worker sector
            </label>
            <Input
              id="search-wallets"
              data-testid="search-input"
              placeholder="Search wallet ID or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search wallet ID or worker sector"
              className="h-[40px] text-xs pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                data-testid="clear-search-btn"
                aria-label="Clear search text"
                className="search-clear-btn"
              >
                ✕
              </button>
            )}
          </div>

          {/* Select filters */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center w-full lg:w-auto">
            <div className="w-full sm:w-44 flex-1 sm:flex-initial">
              <Select
                id="filter-verdict"
                data-testid="filter-verdict"
                aria-label="Filter by verdict"
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value)}
                className="w-full"
              >
                <option value="all">All Verdicts</option>
                <option value="attributed">Attributed Only</option>
                <option value="refused">Refused Only</option>
              </Select>
            </div>

            <div className="w-full sm:w-48 flex-1 sm:flex-initial">
              <Select
                id="filter-cause"
                data-testid="filter-cause"
                aria-label="Filter by churn cause"
                value={causeFilter}
                onChange={(e) => setCauseFilter(e.target.value)}
                disabled={verdictFilter === "refused"}
                className="w-full"
              >
                <option value="all">All Causes</option>
                <option value="job_exit">Job Exit</option>
                <option value="migration">Migration</option>
                <option value="solved_problem">Solved Problem</option>
                <option value="fee_shock">Fee Shock</option>
                <option value="supply_failure">Supply Failure</option>
              </Select>
            </div>

            <div className="w-full sm:w-56 flex-1 sm:flex-initial">
              <Select
                id="sort-by"
                data-testid="sort-by"
                aria-label="Sort wallets by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full"
              >
                <option value="confidence_desc">Sort: Highest Confidence</option>
                <option value="weeks_desc">Sort: Longest Inactive</option>
                <option value="id_asc">Sort: Wallet ID</option>
              </Select>
            </div>

            {(verdictFilter !== "all" || causeFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                data-testid="clear-filters-btn"
                className="text-xs h-[40px] px-3"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Queue Data View */}
      {filteredWallets.length === 0 ? (
        /* ------------------- STATE 3: EMPTY STATE ------------------- */
        <EmptyState
          title="No Wallets Match Filter"
          body="No dormant wallets in the current cohort meet your search or cause filter parameters."
          action={
            <Button variant="secondary" size="sm" onClick={resetFilters} data-testid="empty-reset-btn">
              Reset Filters
            </Button>
          }
          testid="queue-empty-state"
        />
      ) : (
        /* ------------------- STATE 4: SUCCESS STATE TABLE ------------------- */
        <section className="space-y-2" aria-label="Triage Queue Wallet Table">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
            <span>
              Showing <strong className="text-[var(--text)]">{filteredWallets.length}</strong> of {bundle.wallets.length} wallets
            </span>
            <span className="hidden sm:inline">Click any row or press Enter to inspect decline shape & posterior</span>
          </div>

          <Table testid="queue-table">
            <thead>
              <tr>
                <th scope="col" style={{ width: "130px" }}>Wallet ID</th>
                <th scope="col">Worker / Cycle</th>
                <th scope="col" className="text-right">Silent</th>
                <th scope="col">Verdict</th>
                <th scope="col">Attributed Cause</th>
                <th scope="col" className="text-right">Confidence</th>
                <th scope="col" className="hidden md:table-cell">Rule Baseline</th>
                <th scope="col" style={{ width: "90px" }} className="text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredWallets.map((wallet) => {
                const isAttributed = wallet.verdict === "attributed";
                const maxPosterior = wallet.cause
                  ? wallet.posterior[wallet.cause] ?? 0
                  : Math.max(...Object.values(wallet.posterior));
                const confidencePct = (maxPosterior * 100).toFixed(0);

                return (
                  <tr
                    key={wallet.wallet_id}
                    data-testid={`row-${wallet.wallet_id}`}
                    onClick={() => handleRowClick(wallet.wallet_id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRowClick(wallet.wallet_id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Inspect wallet ${wallet.wallet_id}, ${wallet.worker_type}, ${isAttributed ? "Attributed " + (wallet.cause ? CAUSE_LABELS[wallet.cause] : "") : "Refused"}`}
                    className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:bg-[var(--surface-2)]"
                  >
                    {/* Wallet ID */}
                    <td className="font-mono font-medium text-[var(--accent)] tnum">
                      {wallet.wallet_id}
                    </td>

                    {/* Worker Type & Pay cycle */}
                    <td>
                      <div className="font-medium capitalize text-[var(--text)]">{wallet.worker_type}</div>
                      <div className="text-[11px] text-[var(--text-faint)] capitalize">{wallet.pay_cycle}</div>
                    </td>

                    {/* Weeks Silent */}
                    <td className="text-right font-mono tnum text-[var(--text)]">
                      {wallet.weeks_silent} <span className="text-[11px] text-[var(--text-faint)]">wks</span>
                    </td>

                    {/* Verdict Chip: Attributed = Accent, Refused = Neutral Grey (never red!) */}
                    <td>
                      <Chip tone={isAttributed ? "accent" : "neutral"}>
                        {isAttributed ? "Attributed" : "Refused"}
                      </Chip>
                    </td>

                    {/* Top Cause */}
                    <td>
                      {isAttributed && wallet.cause ? (
                        <div className="font-medium text-[var(--text)]">
                          {CAUSE_LABELS[wallet.cause]}
                        </div>
                      ) : (
                        <div className="text-[var(--text-faint)] italic text-xs">
                          {wallet.refusal_reasons?.[0] || "Ambiguous signal"}
                        </div>
                      )}
                    </td>

                    {/* Confidence Score */}
                    <td className="text-right font-mono tnum">
                      <span className={isAttributed ? "text-[var(--text)] font-semibold" : "text-[var(--text-muted)]"}>
                        {confidencePct}%
                      </span>
                    </td>

                    {/* Rule Baseline comparison */}
                    <td className="hidden md:table-cell text-xs">
                      {wallet.rule_baseline.action === "message_everyone" ? (
                        <span className="text-[var(--warning)]">Message All</span>
                      ) : (
                        <span className="text-[var(--text-faint)]">No Action</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="text-right whitespace-nowrap">
                      <a
                        href={`#/w/${wallet.wallet_id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleRowClick(wallet.wallet_id);
                        }}
                        aria-label={`Inspect wallet ${wallet.wallet_id}`}
                        className="text-xs text-[var(--accent)] font-medium hover:underline inline-flex items-center gap-1 justify-end"
                      >
                        Inspect <span aria-hidden="true">&rarr;</span>
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </section>
      )}
    </div>
  );
}
