# STATE — WhyQuiet (Dormant-wallet diagnosis)

Update at session start and before ending every session (AGENTS.md "Read first").

## Current hour
1

## Deployment & Resources
- **GitHub Repo (Public)**: https://github.com/shads-01/whyquiet-dormant-wallet-diagnosis
- **Production URL**: https://whyquiet-dormant-wallet-diagnosis.vercel.app
- **Supabase Project Ref**: `tbvbvvyykozmpbcyrbqw` (region: ap-southeast-1 Singapore)

## Tooling
| Service | Available Via | Notes |
| --- | --- | --- |
| GitHub | CLI (`gh`) | Authenticated as `shads-01` |
| Vercel | MCP (`vercel`) + CLI (`vercel`) | Linked project `whyquiet-dormant-wallet-diagnosis` |
| Supabase | MCP (`supabase`) | Project `tbvbvvyykozmpbcyrbqw` under org `tokenShesh` |
| Context7 | MCP (`context7`) | Resolves and queries official library documentation |

## Window assumption (24 or 48)
UNDECIDED

## Tier 0 checklist (done by hour 24 — AMENDMENTS A7)
- [ ] Generator with populations A and B
- [ ] Rule baseline
- [ ] Trained model with SHAP-style reasons
- [ ] Refusal path
- [ ] Money report with the 1% / 4% / 8% recovery sweep
- [x] Console UI (Scaffolded with Cause Desk placeholder)
- [x] Deployed demo URL that works offline from seeded data (Vercel production active)
- [x] README with every section required by CONTEXT_v3 section 9
- [ ] Report draft
- [ ] Consent/compliance block
- [ ] Minimal fairness check (macro-F1 and refusal rate per worker type and per pay cycle)
- [x] Other mandatory deliverables named in CONTEXT_v3 section 9 (public GitHub repo with continuous commit history; live deployment reachable by judges)

## Done
- Project scaffolded with official generator & locked stack: Python 3.12/uv, FastAPI + Pydantic v2, Vite + React + TS + Tailwind, types generated from OpenAPI contract
- Public GitHub repo created: `whyquiet-dormant-wallet-diagnosis` with clean secret scan and CI (check + e2e) green
- Supabase project `whyquiet` (`tbvbvvyykozmpbcyrbqw`) provisioned on Free tier in Singapore; migration applied with RLS-protected `triage_audit_log`
- Vercel production deployment live with serverless Python API and Vite web app
- Context files locked: AGENTS.md, docs/PROJECT.md (A8), docs/DECISIONS.md (D3b, D8, D9), STATE.md

## In progress
- Datagen & ML model architecture preparation (Hour 1-2)

## Next 3 actions (per PROJECT.md hours 0–2)
1. P1: `datagen/` synthetic generator for populations A and B with 5 cause families and observable fingerprints
2. P2: Implement shape feature extractors in `src/model/` and baseline rule engine in `src/rules/`
3. P3: Train 5-family LightGBM classifier with native SHAP contribution reasons and refusal path

## Open items
- LICENSE choice (none yet — deliberately unlicensed until decided)
- Hobby-plan terms check (Supabase free tier pauses after 7 days inactivity; re-check before demo day)
- Ignored private docs confirmed: `docs/v2/`, `docs/v3/*.md` (except PROJECT.md, STATE.md, DECISIONS.md), `docs/01-*/`, `docs/02-*/`, `docs/archive/`, `spikes/`, `IDEA_POOL.md`, `CONTEXT*.md`, `*.pdf`, `*.docx`

## Blockers
- Window (24 vs 48) UNDECIDED — decide before hour 2 so Tier 1 planning is honest; Tier 0 is identical either way

## Last tool used
gh run watch / verify_deploy

