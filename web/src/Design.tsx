import { useEffect, useState } from "react";
import {
  Button, Card, Chip, EmptyState, ErrorState, Field, Input, Modal, Select,
  Skeleton, Table, ToastStack, type Toast,
} from "./design/ui";

type ThemeId = "instrument" | "neu" | "clay" | "glass" | "brutal" | "paper";

const STYLES: { id: ThemeId; name: string; tagline: string; note: string }[] = [
  { id: "instrument", name: "Instrument", tagline: "Clinical dark · hairline · one accent", note: "Linear/Vercel-grade operator console. Safest fit for a dense diagnostic desk; tabular mono numbers disappear into the work." },
  { id: "neu", name: "Neumorphic", tagline: "Soft extruded surfaces", note: "One flat canvas, light pressed out of shadow. Calm and tactile; the refusal panel reads as physically inert." },
  { id: "clay", name: "Claymorphic ✦ Locked", tagline: "Puffy, rounded, tactile · neumorphic palette", note: "LOCKED as the project style — claymorphic geometry with the neumorphic color tokens (graphite canvas, teal accent). Friendly surfaces keep dense tables calm; every control lifts softly, nothing distracts." },
  { id: "glass", name: "Glass", tagline: "Frosted panels over aurora", note: "Premium and modern. Needs restraint so charts and confusion matrices stay legible over the gradient." },
  { id: "brutal", name: "Industrial", tagline: "Mono type · hard edges · hard shadow", note: "Terminal/industrial, Teenage Engineering energy. Unapologetically tool-like; zero softness, maximum honesty." },
  { id: "paper", name: "Clinical Paper", tagline: "Swiss editorial · serif display", note: "Warm paper, serif headings. Reads like the project report — strong on Evidence, calm everywhere." },
];

const PALETTES: Record<ThemeId, { dark: Record<string, string>; light: Record<string, string> }> = {
  instrument: {
    dark: { bg: "#0B0D12", surface: "#11141B", border: "#232936", text: "#E6EAF2", muted: "#8A93A6", accent: "#5E6AD2", success: "#34D399", danger: "#F87171" },
    light: { bg: "#F7F8FA", surface: "#FFFFFF", border: "#E3E6EC", text: "#171B26", muted: "#5F6779", accent: "#4F5BD5", success: "#0E9F6E", danger: "#DC2626" },
  },
  neu: {
    dark: { bg: "#21252C", surface: "#262A32", border: "rgba(255,255,255,.05)", text: "#D8DDE6", muted: "#8792A3", accent: "#5EC8B4", success: "#34D399", danger: "#F87171" },
    light: { bg: "#E3E8F1", surface: "#E8EDF5", border: "rgba(255,255,255,.6)", text: "#2B3240", muted: "#6B7486", accent: "#2F9E8C", success: "#1D8A5F", danger: "#D43D3D" },
  },
  clay: {
    dark: { bg: "#21252C", surface: "#262A32", border: "rgba(255,255,255,.06)", text: "#D8DDE6", muted: "#8792A3", accent: "#5EC8B4", success: "#34D399", danger: "#F87171" },
    light: { bg: "#E3E8F1", surface: "#E8EDF5", border: "rgba(255,255,255,.6)", text: "#2B3240", muted: "#6B7486", accent: "#2F9E8C", success: "#1D8A5F", danger: "#D43D3D" },
  },
  glass: {
    dark: { bg: "#0A0E1C", surface: "rgba(255,255,255,.06)", border: "rgba(255,255,255,.13)", text: "#EAF2FF", muted: "#93A3C4", accent: "#67E8F9", success: "#6EE7B7", danger: "#FB8A8A" },
    light: { bg: "#EEF3FC", surface: "rgba(255,255,255,.55)", border: "rgba(30,60,120,.12)", text: "#101A30", muted: "#4D5B78", accent: "#0891B2", success: "#0E9F6E", danger: "#DC2626" },
  },
  brutal: {
    dark: { bg: "#141414", surface: "#1E1E1E", border: "#3A3A3A", text: "#E8E8E4", muted: "#96968F", accent: "#FF5500", success: "#7FBF3F", danger: "#F04438" },
    light: { bg: "#ECEBE4", surface: "#F7F6F1", border: "#1C1C1C", text: "#141414", muted: "#57574F", accent: "#FF5500", success: "#3D7A14", danger: "#C21807" },
  },
  paper: {
    dark: { bg: "#1A1917", surface: "#22211E", border: "#38362F", text: "#ECEADE", muted: "#9D9A8A", accent: "#3ECFB2", success: "#34D399", danger: "#F87171" },
    light: { bg: "#FAF9F5", surface: "#FFFFFF", border: "#E5E2D8", text: "#1C1B16", muted: "#6E6B5E", accent: "#0F766E", success: "#0E9F6E", danger: "#DC2626" },
  },
};

const SWATCH_ROLES = ["bg", "surface", "border", "text", "muted", "accent", "success", "danger"] as const;

const DEMO_ROWS = [
  { id: "W-104112", worker: "Garment worker", cycle: "Weekly", weeks: 11, verdict: "attributed", cause: "Job exit", conf: 0.71, rule: "Message all" },
  { id: "W-104117", worker: "Migrant", cycle: "Biweekly", weeks: 9, verdict: "attributed", cause: "Migration", conf: 0.66, rule: "Message all" },
  { id: "W-104132", worker: "Shopkeeper", cycle: "Monthly", weeks: 7, verdict: "refused", cause: "—", conf: 0.38, rule: "Message all" },
  { id: "W-104140", worker: "Garment worker", cycle: "Monthly", weeks: 12, verdict: "refused", cause: "—", conf: 0.27, rule: "Message all" },
  { id: "W-104145", worker: "Salaried", cycle: "Biweekly", weeks: 6, verdict: "attributed", cause: "Fee shock", conf: 0.58, rule: "Message all" },
] as const;

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "var(--space-9)" }}>
      <h2 className="t-xl" style={{ fontWeight: 700 }}>{title}</h2>
      {desc ? <p className="t-sm" style={{ color: "var(--text-muted)", marginTop: 4 }}>{desc}</p> : null}
      <div style={{ marginTop: "var(--space-5)" }}>{children}</div>
    </section>
  );
}

function Row({ children, gap = 12, wrap = true }: { children: React.ReactNode; gap?: number; wrap?: boolean }) {
  return <div style={{ display: "flex", gap, flexWrap: wrap ? "wrap" : "nowrap", alignItems: "center" }}>{children}</div>;
}

export default function Design() {
  const [theme, setTheme] = useState<ThemeId>("clay");
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const addToast = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  };
  const retryDemo = () => {
    setDemoLoading(true);
    setTimeout(() => setDemoLoading(false), 1500);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && toasts.length) setToasts([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toasts.length]);

  const meta = STYLES.find((s) => s.id === theme)!;
  const palette = PALETTES[theme][mode];
  const t = `${theme}` as ThemeId;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* page chrome — outside the theme wrapper */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,9,12,.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #232936" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "10px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>WhyQuiet · Design System</span>
          <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }} aria-label="Design styles">
            {STYLES.map((s) => (
              <button
                key={s.id}
                data-testid={`style-${s.id}`}
                onClick={() => setTheme(s.id)}
                aria-pressed={theme === s.id}
                style={{
                  font: "600 12px Inter, system-ui, sans-serif", padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                  border: "1px solid " + (theme === s.id ? "#5E6AD2" : "#2a2f3c"),
                  background: theme === s.id ? "rgba(94,106,210,.18)" : "transparent",
                  color: theme === s.id ? "#aab2f5" : "#8a93a6",
                }}
              >
                {s.name}
              </button>
            ))}
          </nav>
          <div style={{ marginLeft: "auto" }}>
            <button
              data-testid="mode-toggle"
              onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
              style={{ font: "600 12px Inter, system-ui, sans-serif", padding: "6px 12px", borderRadius: 6, cursor: "pointer", border: "1px solid #2a2f3c", background: "transparent", color: "#8a93a6" }}
            >
              {mode === "dark" ? "☾ Dark" : "☀ Light"}
            </button>
          </div>
        </div>
      </header>

      {/* themed world */}
      <div className={`theme-root theme-${t}`} data-mode={mode} data-testid="theme-root">
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "var(--space-8) var(--space-6) var(--space-10)" }}>
          {/* hero */}
          <div>
            <p className="t-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{meta.tagline}</p>
            <h1 className="t-3xl" style={{ fontWeight: 700, marginTop: 8 }}>{meta.name}</h1>
            <p className="t-md" style={{ color: "var(--text-muted)", marginTop: 8, maxWidth: "64ch" }}>{meta.note}</p>
          </div>

          {/* tokens: color */}
          <Section title="Colour tokens" desc={`Semantic roles — ${mode} mode. Every component reads these vars; a theme is just a re-declaration.`}>
            <Row gap={10}>
              {SWATCH_ROLES.map((role) => (
                <div key={role} style={{ flex: "1 1 110px", minWidth: 110 }}>
                  <div style={{ height: 56, borderRadius: "var(--radius)", border: "1px solid var(--border)", background: palette[role] }} />
                  <div className="t-xs" style={{ marginTop: 6, fontWeight: 600 }}>{role}</div>
                  <div className="t-xs tnum" style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{palette[role]}</div>
                </div>
              ))}
            </Row>
          </Section>

          {/* tokens: type / spacing / radius */}
          <Section title="Type · Space · Radius">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
              <Card className="card-hover" >
                <div style={{ padding: "var(--space-5)" }}>
                  <div className="label">Type scale</div>
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <span className="t-2xl" style={{ fontWeight: 700 }}>Triage <span className="tnum">24,000</span></span>
                    <span className="t-xl" style={{ fontWeight: 600 }}>Posterior over causes</span>
                    <span className="t-md">Wallet detail — decline shape since acquisition</span>
                    <span className="t-sm tnum" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>W-104112 · macro-F1 0.52 · B</span>
                    <span className="t-xs" style={{ color: "var(--text-faint)" }}>ASSUMED labels · refusal reasons · τ = 0.55</span>
                  </div>
                </div>
              </Card>
              <Card className="card-hover">
                <div style={{ padding: "var(--space-5)" }}>
                  <div className="label">Spacing (4px base, dense console)</div>
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {["--space-2", "--space-3", "--space-4", "--space-5", "--space-6", "--space-8"].map((v) => (
                      <div key={v} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className="t-xs tnum" style={{ width: 88, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{v}</span>
                        <span style={{ height: 10, width: `var(${v})`, background: "var(--accent)", borderRadius: 2, opacity: 0.8 }} />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card className="card-hover">
                <div style={{ padding: "var(--space-5)" }}>
                  <div className="label">Radii</div>
                  <Row gap={12}>
                    {(["--radius-sm", "--radius", "--radius-lg"] as const).map((v) => (
                      <div key={v} style={{ textAlign: "center" }}>
                        <div style={{ width: 64, height: 64, borderRadius: `var(${v})`, background: "var(--surface-2)", border: "1px solid var(--border)" }} />
                        <div className="t-xs" style={{ marginTop: 6, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{v.replace("--radius-", "r")}</div>
                      </div>
                    ))}
                  </Row>
                  <div className="t-xs" style={{ marginTop: 14, color: "var(--text-faint)" }}>
                    Hover any card on this page — transitions are 140–220ms, disabled under <code>prefers-reduced-motion</code>.
                  </div>
                </div>
              </Card>
            </div>
          </Section>

          {/* buttons */}
          <Section title="Buttons" desc="Hover the live ones — every style has its own tactile language (instrument brightens, clay lifts, brutal walks its shadow, neu presses in).">
            <Row>
              <Button data-testid="btn-primary">Propose batch</Button>
              <Button variant="secondary">Preview message</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Reject</Button>
            </Row>
            <Row>
              <Button size="sm">Small</Button>
              <Button loading>Loading…</Button>
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>Disabled 2nd</Button>
            </Row>
          </Section>

          {/* inputs */}
          <Section title="Inputs, Search & Custom Dropdowns" desc="Claymorphic form controls with tactile inner shadows, smooth focus rings, inline search clearing, and custom rounded floating dropdown menus.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-5)", maxWidth: 760 }}>
              <Field id="d-cause" label="Claymorphic Dropdown" hint="Custom styled rounded popup menu.">
                <Select id="d-cause" data-testid="select-demo" defaultValue="job_exit">
                  <option value="job_exit">Job exit</option>
                  <option value="migration">Migration</option>
                  <option value="solved_once">Solved once</option>
                  <option value="fee_shock">Fee shock</option>
                  <option value="supply_blocked">Supply blocked</option>
                  <option value="refused">Refused</option>
                </Select>
              </Field>
              <Field id="d-search" label="Search with Inline Cross" hint="Inline cross button clears text.">
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Input id="d-search" placeholder="Search wallet or sector…" defaultValue="Garment" className="pr-8" />
                  <button type="button" className="search-clear-btn" aria-label="Clear search">✕</button>
                </div>
              </Field>
              <Field id="d-wallet" label="Wallet ID" hint="Pseudonymous only — no PII.">
                <Input id="d-wallet" mono placeholder="W-104112" />
              </Field>
              <Field id="d-note" label="Approver note (required)" error="A note is required to reject a batch.">
                <Input id="d-note" invalid placeholder="Reason for rejection…" />
              </Field>
            </div>
          </Section>

          {/* chips + kbd */}
          <Section title="Chips & verdict states">
            <Row>
              <Chip tone="accent">Attributed · job exit</Chip>
              <Chip tone="neutral">Refused — no attributable cause</Chip>
              <Chip tone="success">Approved</Chip>
              <Chip tone="warning">ASSUMED</Chip>
              <Chip tone="danger">API down</Chip>
            </Row>
            <Row>
              <span className="t-sm" style={{ color: "var(--text-muted)" }}>Keyboard: <kbd>⌘K</kbd> <kbd>Esc</kbd> closes dialogs and toasts.</span>
            </Row>
          </Section>

          {/* table */}
          <Section title="Table — triage queue" desc="Dense rows, sticky header, tabular numbers, hover tint. Refused is neutral grey, never red.">
            <Table testid="table-demo">
              <thead>
                <tr><th>Wallet</th><th>Worker type</th><th>Pay cycle</th><th>Weeks silent</th><th>Verdict</th><th>Top cause</th><th>Confidence</th><th>Rule baseline</th></tr>
              </thead>
              <tbody>
                {DEMO_ROWS.map((r) => (
                  <tr key={r.id} data-testid={`row-${r.id}`}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.id}</td>
                    <td>{r.worker}</td>
                    <td style={{ color: "var(--text-muted)" }}>{r.cycle}</td>
                    <td className="tnum">{r.weeks}</td>
                    <td><Chip tone={r.verdict === "attributed" ? "accent" : "neutral"}>{r.verdict}</Chip></td>
                    <td>{r.cause}</td>
                    <td className="tnum">{r.conf.toFixed(2)}</td>
                    <td style={{ color: "var(--text-faint)" }}>{r.rule}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Section>

          {/* kpis + remedy + refusal */}
          <Section title="Cards — KPIs, remedy, and the refusal (money shot)">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
              <Card className="card-hover"><div style={{ padding: "var(--space-5)" }}>
                <div className="label">Attributed</div>
                <div className="kpi-value" style={{ marginTop: 8 }}>12</div>
                <div className="t-xs" style={{ color: "var(--text-faint)", marginTop: 6 }}>of 20 triaged wallets</div>
              </div></Card>
              <Card className="card-hover"><div style={{ padding: "var(--space-5)" }}>
                <div className="label">Refused</div>
                <div className="kpi-value" style={{ marginTop: 8 }}>8</div>
                <div className="t-xs" style={{ color: "var(--text-faint)", marginTop: 6 }}>refusal rate 40% — reported, never targeted</div>
              </div></Card>
              <Card className="card-hover"><div style={{ padding: "var(--space-5)" }}>
                <div className="label">Recovered (model)</div>
                <div className="kpi-value" style={{ marginTop: 8 }}>1.9%</div>
                <div className="t-xs" style={{ color: "var(--text-faint)", marginTop: 6 }}><Chip tone="warning">ASSUMED</Chip> at 4% recovery</div>
              </div></Card>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
              <Card className="card-hover"><div style={{ padding: "var(--space-5)" }}>
                <Row><Chip tone="accent">Job exit</Chip><span className="t-xs" style={{ color: "var(--text-faint)" }}>unit cost <span className="tnum">Tk 18</span> <Chip tone="warning">ASSUMED</Chip></span></Row>
                <h3 className="t-lg" style={{ fontWeight: 600, marginTop: 10 }}>Reactivation — employer referral</h3>
                <p className="t-sm" style={{ color: "var(--text-muted)", marginTop: 6 }}>EN: “Your wallet went quiet after your last payday. If you changed jobs, here is how to switch your wage wallet in 2 minutes.”</p>
                <p className="t-sm" style={{ color: "var(--text-muted)", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12 }}>বাং: “শেষ বেতনের পর আপনার ওয়ালেট চুপ হয়ে গেছে। চাকরি বদল হলে ২ মিনিটে ওয়ালেট বদলান।”</p>
                <div style={{ marginTop: 14 }}><Button size="sm" variant="secondary">Preview in campaign</Button></div>
              </div></Card>
              <div className="card card-hover" style={{ padding: "var(--space-5)" }}>
                <div className="chip chip-neutral">Refused</div>
                <h3 className="t-lg" style={{ fontWeight: 700, marginTop: 12 }}>No attributable cause. I will not spend your money here.</h3>
                <p className="t-sm" style={{ color: "var(--text-muted)", marginTop: 8 }}>Top-2 margin 0.04 &lt; δ. Posterior is near-uniform across five causes.</p>
                <p className="t-sm" style={{ color: "var(--text-faint)", marginTop: 8 }}>Contributions: none of 22 features discriminates beyond noise. No action buttons — refusal is terminal.</p>
              </div>
            </div>
          </Section>

          {/* modal */}
          <Section title="Modal — native <dialog>">
            <Row>
              <Button data-testid="open-modal" onClick={() => setModalOpen(true)}>Open approve dialog</Button>
            </Row>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Approve batch · Job exit"
              testid="modal-demo"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button data-testid="confirm-approve" onClick={() => { setModalOpen(false); addToast({ tone: "success", title: "Batch approved", body: "7 wallets · campaign JSON ready to download." }); }}>Approve</Button>
                </>
              }
            >
              <p>7 attributed wallets · total cost <strong className="tnum">Tk 126</strong> <Chip tone="warning">ASSUMED</Chip></p>
              <p style={{ marginTop: 8 }}>You are approving as approver@whyquiet. Proposer cannot approve their own batch.</p>
            </Modal>
          </Section>

          {/* toasts */}
          <Section title="Toasts" desc="Bottom-right, auto-dismiss 4s, Esc clears.">
            <Row>
              <Button variant="secondary" onClick={() => addToast({ tone: "accent", title: "Sample data mode", body: "Loaded 20 wallets from seed.sample.json." })}>Info toast</Button>
              <Button variant="secondary" onClick={() => addToast({ tone: "success", title: "Batch approved", body: "Campaign JSON ready." })}>Success toast</Button>
              <Button variant="secondary" onClick={() => addToast({ tone: "danger", title: "Write path offline", body: "Read-only screens still work." })}>Danger toast</Button>
            </Row>
          </Section>

          {/* states */}
          <Section title="Empty · Error · Loading">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
              <EmptyState
                title="No wallets match this filter"
                body="Try clearing the verdict or cause filter — the seed covers all five causes."
                action={<Button size="sm" variant="secondary" onClick={() => addToast({ tone: "accent", title: "Filters cleared" })}>Clear filters</Button>}
                testid="empty-demo"
              />
              {demoLoading ? (
                <Card><div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: 12 }}>
                  <Skeleton w="40%" h={18} />
                  <Skeleton w="100%" /><Skeleton w="92%" /><Skeleton w="96%" /><Skeleton w="70%" />
                  <div className="t-xs" style={{ color: "var(--text-faint)" }}>Reloading evidence…</div>
                </div></Card>
              ) : (
                <ErrorState
                  title="Money model pending"
                  body="report.money is null in this bundle — the sweep arrives with the trained model. Rule baseline still shown."
                  onRetry={retryDemo}
                  testid="error-demo"
                />
              )}
            </div>
          </Section>

          <footer style={{ marginTop: "var(--space-9)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
            <p className="t-xs" style={{ color: "var(--text-faint)" }}>
              WhyQuiet · Cause Desk design system · 6 candidate styles · pick one and the whole console inherits it.
            </p>
          </footer>
        </div>
        <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((x) => x.id !== id))} />
      </div>
    </div>
  );
}
