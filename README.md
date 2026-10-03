# WhyQuiet

**Dormant-wallet diagnosis**

A dormant wallet is not one problem. A wallet going quiet is five diseases — job exit, migration,
a solved problem, a fee shock, a supply-side failure — and upay only has one thermometer: three
weeks without a transaction. WhyQuiet reads a dormant wallet's transaction shape, attributes a cause
where one is attributable, maps it to a priced remedy, and **refuses** where the shape is ambiguous.

> Simulated causes, shift-tested on an unseen population — no real-world accuracy claim.

## Quick start

```sh
make dev      # API on :8000 + web on :5173
make check    # ruff, pyright, pytest, generated types, tsc, lint, build
```

## Architecture

- `datagen/` — synthetic populations A (train) and B (shifted eval); ground truth in `truth/` (eval-only)
- `src/model/` — shape features → 5-family classifier; never imports `truth/`
- `src/rules/` — deterministic business rules (refuse/act, budgets, thresholds)
- `src/api/` — FastAPI; every response separates prediction / assumption / generated text
- `web/` — Cause Desk console (Vite + React + TS + Tailwind + Recharts)
- `supabase/` — optional audit log (free tier); local-file fallback keeps it optional

## Report sections (CONTEXT_v3 §9 — to be filled)

- Executive summary
- Problem & user
- Solution & demo
- AI/ML method
- Data & synthetic generator
- Validation: A-test vs population B
- Money report: rule vs model vs oracle (1% / 4% / 8% recovery sweep)
- Fairness & responsible AI
- Refusal behaviour
- Scalability & seams
- Limitations & honest claims
- Appendix: how to run

## Open items

- LICENSE choice (none yet — deliberately unlicensed until decided)
