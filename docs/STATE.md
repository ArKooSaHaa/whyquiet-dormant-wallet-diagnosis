# STATE — upay Cause Desk (F1)

Update at session start and before ending every session (AGENTS.md "Read first").

## Current hour
0

## Window assumption (24 or 48)
UNDECIDED

## Tier 0 checklist (done by hour 24 — AMENDMENTS A7)
- [ ] Generator with populations A and B
- [ ] Rule baseline
- [ ] Trained model with SHAP-style reasons
- [ ] Refusal path
- [ ] Money report with the 1% / 4% / 8% recovery sweep
- [ ] Console UI
- [ ] Deployed demo URL that works offline from seeded data
- [ ] README with every section required by CONTEXT_v3 section 9
- [ ] Report draft
- [ ] Consent/compliance block
- [ ] Minimal fairness check (macro-F1 and refusal rate per worker type and per pay cycle)
- [ ] Other mandatory deliverables named in CONTEXT_v3 section 9 (public GitHub repo with continuous commit history; live deployment reachable by judges; video demo)

## Done
- Project locked: F1 Cause Desk (docs/PROJECT.md with AMENDMENTS A1–A7; docs/DECISIONS.md seeded D1–D7)
- Shared agent context created (AGENTS.md, CLAUDE.md, GEMINI.md, .agents/rules/00-project.md, opencode.json)

## In progress
- Nothing (hour 0)

## Next 3 actions (per PROJECT.md hours 0–2)
1. P1: scaffold repo; `datagen/` skeleton; write the 5 cause families and their observable fingerprints
2. P2: repo scaffold; FastAPI skeleton with `/profile /triage /explain /refuse` stubs
3. P3: repo scaffold; wire a "judge can try this" URL; README skeleton with all §9 headings

## Blockers
- Window (24 vs 48) UNDECIDED — decide before hour 2 so Tier 1 planning is honest; Tier 0 is identical either way

## Last tool used
none (session start)
