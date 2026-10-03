# DECISIONS — append-only

> Append-only table. Never edit or delete an existing row. If something must change, add a NEW proposal
> row with the next free id and stop — the human decides (AGENTS.md hard rule 2).

| id | decision | reason |
| --- | --- | --- |
| D1 | Idea locked: F1 Cause Desk. Fallback on hour-12 failure: F3. | Top finalist (Rel 5 / Biz 5 / Orig 5, total 15 — finalists.md §0); F3 reuses this generator's skeleton so switching costs hours, not days (finalists.md §6 note 4). |
| D2 | Labels and circularity handled as AMENDMENTS A1–A3. | The original F1 text made a "label-free" claim; A1 replaces the claim and the AI-role row, A2 fixes label file handling, A3 makes the circularity defence part of the spec. |
| D3 | Stack: Python 3.11, pandas/parquet, LightGBM + scikit-learn, SHAP, FastAPI; web = Vite + React single page. No LLM in the decision path; an LLM may only phrase explanations from structured evidence. | Matches the official suggested stack (CONTEXT_v3 §6) and §12: "Do not put sensitive decision logic entirely inside a free-form LLM prompt." |
| D4 | Refusal API: verdict in {"attributed","refused"}. Refuse when max posterior < tau or top-2 margin < delta; tau/delta tuned on validation; refusal rate is REPORTED, never targeted. | Refusal is the product (finalists.md F1); A5 makes refusal rate 0% on either population a failing test. |
| D5 | Numbers: triage share, recovery rate, ARPU and all taka figures are ASSUMED; print them labelled ASSUMED with the 1% / 4% / 8% sweep. Never print upay's undisclosed revenue base; use rates, ratios, counts. | finalists.md §6 note 3; the F1 honest answer concedes there is no evidence for 4% in either direction (economics.md §3 #15). |
| D6 | Demo runs offline from seeded data with one command; no live external calls. | CONTEXT_v3 §9 requires a live deployment reachable by judges; seeded offline data makes the demo reproducible and survives judge-side connectivity/requirement surprises. |
| D7 | Window and Tier 0/Tier 1 split per A7, including the fairness check moved into Tier 0. | A7: the first 24 hours must stand alone as a complete submission; A7 names this move a proposal by the lock step and requires it be recorded here. |
| D3b | stack LOCKED: web app only, desktop-first; Python 3.11 + uv; FastAPI + Pydantic v2; LightGBM (native pred_contrib for SHAP-style reasons at inference; `shap` offline group only); Vite + React + TS + Tailwind + Recharts; types generated from OpenAPI; pinned deps. | Pinned dependencies and clean separating of offline vs inference packages ensures deterministic builds and keeps bundle within hosting limits. |
| D8 | hosting: Vercel (web + Python function) + Supabase free (optional audit log, local-file fallback keeps D6). | Free-tier deployment reachable by judges with zero mandatory external dependency at runtime. Known risks: Python function 500 MB limit; Supabase free pauses after 7 days idle (re-check before demo day). |
| D9 | naming: WhyQuiet / "Dormant-wallet diagnosis" / repo whyquiet-dormant-wallet-diagnosis. | Product named WhyQuiet; Cause Desk is the operator console screen within WhyQuiet. |

