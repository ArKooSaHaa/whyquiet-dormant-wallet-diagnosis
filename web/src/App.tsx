import { useEffect, useState, useRef } from "react";
import type { components } from "./api/schema";
import { loadSeed, isSampleFallbackUsed, type SeedBundle } from "./seed";
import Design from "./Design";
import Queue from "./Queue";
import Wallet from "./Wallet";
import Batches from "./Batches";
import Evidence from "./Evidence";
import { Button, Modal, Field, Input, Chip } from "./design/ui";
import { login, getStoredUser, clearStoredUser, type UserSession } from "./api";

type Health = components["schemas"]["HealthResponse"];

// Demo passwords are public on purpose so judges sign in with one click (D42).
// Anything proposed or approved with them is written to production and cannot be deleted.
const DEMO_PASSWORDS: Record<string, string> = {
  "analyst@whyquiet.demo": "i0iwIWPTWErz7vZU",
  "approver@whyquiet.demo": "9ZgWNABJwHCoI01h",
};

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

  // Signed-in user from /api/auth/login (token + user_id + server role, in sessionStorage)
  const [user, setUser] = useState<UserSession | null>(getStoredUser);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("analyst@whyquiet.demo");
  const [loginPassword, setLoginPassword] = useState(DEMO_PASSWORDS["analyst@whyquiet.demo"]);
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);

  // Profile Dropdown state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && profileOpen) {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
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
    try {
      setUser(await login(loginEmail.trim(), loginPassword));
      setLoginOpen(false);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoginPending(false);
    }
  };

  const handleLogout = () => {
    clearStoredUser();
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
      {/* Skip to main content link for keyboard & screen reader accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-[var(--accent-fg)] focus:rounded-[var(--radius-sm)] focus:shadow-[var(--shadow-pop)] focus:font-semibold text-xs"
      >
        Skip to main content
      </a>

      {/* Sample Banner (Task 0 requirement & smoke test) */}
      {isSample && (
        <div
          data-testid="sample-banner"
          role="status"
          className="t-xs text-center font-medium"
          style={{ background: "var(--warning-soft)", color: "var(--warning)", padding: "6px 16px" }}
        >
          Sample data mode ({seed?.wallets.length ?? 0} wallets loaded from seed.sample.json)
        </div>
      )}

      {/* Primary Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Minimalist Logo & Brand */}
          <div className="flex items-center gap-6">
            <a href="#/" className="flex items-center gap-2.5 text-decoration-none group" aria-label="WhyQuiet Cause Desk Home">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#1b6a5d] text-white flex items-center justify-center shadow-[var(--shadow-1)] ring-1 ring-[var(--border)]" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h3l3-7 4 14 3-7h5" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  WhyQuiet
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)] inline m-0">
                  Cause Desk
                </span>
              </div>
            </a>

            {/* Navigation Tabs (Queue / Batches / Evidence) */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              <a
                href="#/"
                aria-current={isQueue ? "page" : undefined}
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
                aria-current={isBatches ? "page" : undefined}
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
                aria-current={isEvidence ? "page" : undefined}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors ${
                  isEvidence
                    ? "bg-[var(--surface-2)] text-[var(--accent)] shadow-[var(--shadow-1)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                Evidence
              </a>
            </nav>
          </div>

          {/* Right Area: Theme Toggle, API Status & Round Profile Avatar Dropdown */}
          <div className="flex items-center gap-2.5">
            {/* Dark / Light mode toggle */}
            <button
              type="button"
              onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
              className="btn btn-secondary btn-sm h-[32px] px-2.5 flex items-center gap-1.5 cursor-pointer text-xs"
              data-testid="mode-toggle"
              aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
            >
              {mode === "light" ? (
                <>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span className="hidden sm:inline font-medium">Dark</span>
                </>
              )}
            </button>

            <span
              className={`chip ${health ? "chip-success" : "chip-danger"}`}
              data-testid="api-badge"
              role="status"
              title={health ? `API Online (${health.version})` : "API Offline (using seed cache)"}
            >
              {health ? "API ok" : "API down"}
            </span>

            {user ? (
              <div className="relative" ref={profileRef}>
                {/* Round Profile Avatar Icon taking place of Sign In button */}
                <button
                  ref={profileButtonRef}
                  type="button"
                  onClick={() => setProfileOpen((o) => !o)}
                  data-testid="profile-avatar-btn"
                  className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border-strong)] hover:border-[var(--accent)] flex items-center justify-center text-xs font-bold text-[var(--text)] cursor-pointer shadow-[var(--shadow-1)] transition-colors relative"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-controls={profileOpen ? "profile-dropdown-menu" : undefined}
                  aria-label={`User Profile Menu for ${user.email}`}
                >
                  <span className="w-full h-full rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--text)] font-semibold text-xs tracking-wider" aria-hidden="true">
                    {user.email.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--success)] ring-2 ring-[var(--surface)]" aria-hidden="true" />
                </button>

                {/* Profile Dropdown with 2 options: 1. Profile Info, 2. Logout */}
                {profileOpen && (
                  <div
                    id="profile-dropdown-menu"
                    role="menu"
                    aria-label="User account options"
                    className="absolute right-0 mt-2 w-56 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-pop)] py-1.5 z-50 animate-in fade-in"
                    data-testid="profile-dropdown-menu"
                  >
                    {/* Option 1: Profile Details */}
                    <div className="px-3.5 py-2.5 border-b border-[var(--border)]" role="none">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Signed in as</div>
                      <div className="text-xs font-semibold text-[var(--text)] truncate font-mono mt-0.5">{user.email}</div>
                      <div className="inline-block mt-1.5">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    {/* Option 2: Logout Button */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      data-testid="logout-btn"
                      className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface-2)] flex items-center gap-2 cursor-pointer transition-colors border-none bg-transparent"
                    >
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
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
        <nav className="md:hidden flex items-center justify-around border-t border-[var(--border)] py-2 px-3 bg-[var(--surface-2)]" aria-label="Mobile Navigation">
          <a
            href="#/"
            aria-current={isQueue ? "page" : undefined}
            className={`text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] ${
              isQueue ? "bg-[var(--surface)] text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
          >
            Queue
          </a>
          <a
            href="#/batches"
            aria-current={isBatches ? "page" : undefined}
            className={`text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] ${
              isBatches ? "bg-[var(--surface)] text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
          >
            Batches
          </a>
          <a
            href="#/evidence"
            aria-current={isEvidence ? "page" : undefined}
            className={`text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] ${
              isEvidence ? "bg-[var(--surface)] text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
          >
            Evidence
          </a>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
            aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
            className="text-xs font-semibold px-2 py-1 text-[var(--text-muted)] border-none bg-transparent cursor-pointer"
          >
            {mode === "light" ? "☀" : "☾"}
          </button>
        </nav>
      </header>

      {/* Main Routed Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 focus:outline-none">
        {walletMatch ? (
          <Wallet walletId={walletMatch[1]} onBack={() => (window.location.hash = "#/")} />
        ) : isBatches ? (
          <Batches user={user} onOpenLogin={() => setLoginOpen(true)} />
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
              required
              aria-required="true"
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
              required
              aria-required="true"
            />
          </Field>

          <div className="space-y-1.5">
            <div className="text-xs text-[var(--text-muted)] font-medium">Quick Demo Personas:</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={loginEmail === "analyst@whyquiet.demo" ? "primary" : "secondary"}
                size="sm"
                data-testid="login-role-analyst"
                aria-label="Select Analyst demo persona"
                onClick={() => {
                  setLoginEmail("analyst@whyquiet.demo");
                  setLoginPassword(DEMO_PASSWORDS["analyst@whyquiet.demo"]);
                }}
              >
                Analyst
              </Button>
              <Button
                type="button"
                variant={loginEmail === "approver@whyquiet.demo" ? "primary" : "secondary"}
                size="sm"
                data-testid="login-role-approver"
                aria-label="Select Approver demo persona"
                onClick={() => {
                  setLoginEmail("approver@whyquiet.demo");
                  setLoginPassword(DEMO_PASSWORDS["approver@whyquiet.demo"]);
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
