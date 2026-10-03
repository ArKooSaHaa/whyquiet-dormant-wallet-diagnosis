import { useEffect, useState } from "react";
import type { components } from "./api/schema";

type Health = components["schemas"]["HealthResponse"];


export default function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold">WhyQuiet</h1>
        <p className="mt-2 text-slate-400">Dormant-wallet diagnosis</p>
        <span
          data-testid="api-badge"
          className={
            health
              ? "mt-4 inline-block rounded-full bg-emerald-900 px-3 py-1 text-sm text-emerald-300"
              : "mt-4 inline-block rounded-full bg-red-900 px-3 py-1 text-sm text-red-300"
          }
        >
          {health ? "API ok" : "API down"}
        </span>
        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Cause Desk</h2>
          <p className="mt-2 text-slate-400">
            Operator console placeholder — triage list and decline shape arrive with the model.
          </p>
        </section>
      </main>
    </div>
  );
}
