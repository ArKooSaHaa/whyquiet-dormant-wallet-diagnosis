import { useEffect, useState } from "react";
import type { components } from "./api/schema";
import { loadSeed, isSampleFallbackUsed, type SeedBundle } from "./seed";
import Design from "./Design";
import Queue from "./Queue";
import Wallet from "./Wallet";
import Batches from "./Batches";
import Evidence from "./Evidence";
import { Button, Modal, Field, Input, Chip } from "./design/ui";

type Health = components["schemas"]["HealthResponse"];

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const on = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  const [health, setHealth] = useState<Health | null>(null);
  const [seed, setSeed] = useState<SeedBundle | null>(null);
  const [isSample, setIsSample] = useState(false);

  // Global Theme Mode: Light mode by default when opened
  const [mode, setMode] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("wq_mode");
    return (saved as "light" | "dark") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem("wq_mode", mode);
  }, [mode]);

  // Demo Auth State (in sessionStorage)
  const [user, setUser] = useState<{ email: string; role: "analyst" | "approver" } | null>(() => {
    const saved = sessionStorage.getItem("wq_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("analyst@whyquiet.demo");
  const [loginPassword, setLoginPassword] = useState("••••••••");
  const [loginRole, setLoginRole] = useState<"analyst" | "approver">("analyst");
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then(setHealth)
      .catch(() => setHealth(null));

    loadSeed()
      .then((bundle) => {
        setSeed(bundle);
        setIsSample(isSampleFallbackUsed() || bundle.meta.model_version === "sample");
      })
      .catch(() => {});
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail.trim()) {
      setLoginError("Email is required.");
      return;
    }
    if (!loginEmail.includes("@")) {
      setLoginError("Please enter a valid email address.");
      return;
    }

    setLoginPending(true);
    setTimeout(() => {
      const newUser = { email: loginEmail.trim(), role: loginRole };
      sessionStorage.setItem("wq_user", JSON.stringify(newUser));
      setUser(newUser);
      setLoginPending(false);
      setLoginOpen(false);
    }, 400);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("wq_user");
    setUser(null);
  };

  // Route matchers
  const isDesign = hash.startsWith("#/design");
  const walletMatch = hash.match(/^#\/w\/([A-Za-z0-9_-]+)/);
  const isBatches = hash.startsWith("#/batches");
  const isEvidence = hash.startsWith("#/evidence");
  const isQueue = !isDesign && !walletMatch && !isBatches && !isEvidence;

  if (isDesign) return <Design />;

  return (
    <div className="theme-root flex flex-col min-h-screen" data-mode={mode}>
      {/* Sample Banner (Task 0 requirement & smoke test) */}
      {isSample && (
        <div
          data-testid="sample-banner"
          className="t-xs text-center font-medium"
          style={{ background: "var(--warning-soft)", color: "var(--warning)", padding: "6px 16px" }}
        >
          Sample data mode ({seed?.wallets.length ?? 0} wallets loaded from seed.sample.json)
        </div>
      )}

      {/* Primary Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-6">
            <a href="#/" className="flex items-center gap-2.5 text-decoration-none group">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center font-bold text-sm shadow-[var(--shadow-1)]">
                WQ
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="t-md font-bold tracking-tight text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                    WhyQuiet
                  </span>
                  <span className="text-[var(--text-faint)]">·</span>
                  <h2 className="t-md font-semibold text-[var(--text)] inline">
                    Cause Desk
                  </h2>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] -mt-0.5 hidden sm:block">
                  Dormant-wallet diagnosis console
                </div>
              </div>
            </a>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              <a
                href="#/"
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors ${
                  isQueue
                    ? "bg-[var(--surface-2)] text-[var(--accent)] shadow-[var(--shadow-1)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                Triage Queue
              </a>
              <a
                href="#/batches"
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors ${
                  isBatches
                    ? "bg-[var(--surface-2)] text-[var(--accent)] shadow-[var(--shadow-1)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                Batches
              </a>
              <a
                href="#/evidence"
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors ${
                  isEvidence
                    ? "bg-[var(--surface-2)] text-[var(--accent)] shadow-[var(--shadow-1)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                Evidence
              </a>
              <a
                href="#/design"
                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
              >
                Design System
              </a>
            </nav>
          </div>

          {/* Right Area: Theme Toggle, API Status & User Session */}
          <div className="flex items-center gap-2.5">
            {/* Dark / Light mode toggle */}
            <button
              type="button"
              onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
              className="btn btn-secondary btn-sm h-[32px] px-2.5 flex items-center gap-1.5 cursor-pointer text-xs"
              data-testid="mode-toggle"
              title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
              aria-label="Toggle dark/light mode"
            >
              {mode === "light" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span className="hidden sm:inline font-medium">Light</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span className="hidden sm:inline font-medium">Dark</span>
                </>
              )}
            </button>

            <span
              className={`chip ${health ? "chip-success" : "chip-danger"}`}
              data-testid="api-badge"
              title={health ? `API Online (${health.version})` : "API Offline (using seed cache)"}
            >
              {health ? "API ok" : "API down"}
            </span>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-mono text-[var(--text)]">{user.email}</div>
                  <div className="text-[10px] text-[var(--accent)] capitalize font-semibold">{user.role}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs">
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLoginOpen(true)}
                data-testid="open-login-btn"
                className="text-xs"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around border-t border-[var(--border)] py-2 px-3 bg-[var(--surface-2)]">
          <a
            href="#/"
            className={`text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] ${
              isQueue ? "bg-[var(--surface)] text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
          >
            Queue
          </a>
          <a
            href="#/batches"
            className={`text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] ${
              isBatches ? "bg-[var(--surface)] text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
          >
            Batches
          </a>
          <a
            href="#/evidence"
            className={`text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] ${
              isEvidence ? "bg-[var(--surface)] text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
          >
            Evidence
          </a>
          <a
            href="#/design"
            className="text-xs font-semibold px-2.5 py-1 text-[var(--text-faint)]"
          >
            Design
          </a>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
            className="text-xs font-semibold px-2 py-1 text-[var(--text-muted)] border-none bg-transparent cursor-pointer"
          >
            {mode === "light" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      {/* Main Routed Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {walletMatch ? (
          <Wallet walletId={walletMatch[1]} onBack={() => (window.location.hash = "#/")} />
        ) : isBatches ? (
          <Batches />
        ) : isEvidence ? (
          <Evidence />
        ) : (
          <Queue onNavigate={(wId) => (window.location.hash = `#/w/${wId}`)} />
        )}
      </main>

      {/* Footer Strip with Honesty Line */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-4 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <div className="text-center md:text-left">
            <span className="font-semibold text-[var(--text)]">Honesty Principle: </span>
            <span>
              {seed?.meta.honesty_line ||
                "Real ledgers contain no cause label. We train on simulated causes and evaluate on shifted population B. We claim robustness to distribution shift in simulation, not real-world accuracy."}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Chip tone="warning">ASSUMED</Chip>
            <span className="font-mono text-[11px] text-[var(--text-faint)]">
              Model: {seed?.meta.model_version || "sample"} · τ={seed?.meta.tau || 0.5} · δ={seed?.meta.delta || 0.1}
            </span>
          </div>
        </div>
      </footer>

      {/* Login Dialog Modal */}
      <Modal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title="Sign In to Cause Desk"
        testid="login-modal"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setLoginOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loginPending}
              disabled={loginPending}
              onClick={handleLoginSubmit}
              data-testid="login-submit-btn"
            >
              Sign In
            </Button>
          </div>
        }
      >
        <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
          <Field label="Email Address" id="login-email" error={loginError || undefined}>
            <Input
              id="login-email"
              type="email"
              data-testid="login-email"
              value={loginEmail}
              onChange={(e) => {
                setLoginEmail(e.target.value);
                if (loginError) setLoginError("");
              }}
              invalid={Boolean(loginError)}
              autoFocus
            />
          </Field>

          <Field label="Password" id="login-password">
            <Input
              id="login-password"
              type="password"
              data-testid="login-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </Field>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-[var(--text-muted)]">Demo Persona Quick Select</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={loginRole === "analyst" ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setLoginRole("analyst");
                  setLoginEmail("analyst@whyquiet.demo");
                }}
              >
                Analyst
              </Button>
              <Button
                type="button"
                variant={loginRole === "approver" ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setLoginRole("approver");
                  setLoginEmail("approver@whyquiet.demo");
                }}
              >
                Approver
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
