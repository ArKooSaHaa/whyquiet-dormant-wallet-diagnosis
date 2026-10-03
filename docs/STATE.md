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

## Window assumption
8 hours (D18 locked: full project build across Shads, Hrittika, Arko)

## Tier 0 checklist (done by hour 24 — AMENDMENTS A7)
- [ ] Generator with populations A and B
- [ ] Rule baseline
- [ ] Trained model with SHAP-style reasons
- [ ] Refusal path
- [ ] Money report with the 1% / 4% / 8% recovery sweep
- [x] Console UI (Scaffolded with Cause Desk placeholder)
- [x] Deployed demo URL that works offline from seeded data (Vercel production active)
- [ ] README with every section required by CONTEXT_v3 section 9
- [ ] Report draft
- [ ] Consent/compliance block
- [ ] Minimal fairness check (macro-F1 and refusal rate per worker type and per pay cycle)
- [x] Other mandatory deliverables named in CONTEXT_v3 section 9 (public GitHub repo with continuous commit history; live deployment reachable by judges)

## Done
- Project scaffolded with official generator & locked stack: Python 3.12/uv, FastAPI + Pydantic v2, Vite + React + TS + Tailwind, types generated from OpenAPI contract
- Public GitHub repo created: `whyquiet-dormant-wallet-diagnosis` with clean secret scan and CI (check + e2e) green
- Supabase project `whyquiet` (`tbvbvvyykozmpbcyrbqw`) provisioned on Free tier in Singapore; migration applied with RLS-protected `triage_audit_log`
- Vercel production deployment live with serverless Python API and Vite web app
- Context files standardized to uniform format: AGENTS.md, CLAUDE.md, GEMINI.md, OPENCODE.md, opencode.json, .agents/rules/00-project.md
- System design finalized & approved in `docs/system-design.md` with radical ponytail simplification (Tier 0 vs Tier 1, public offline read screens, 2-person batch approval, campaign download, zero PII, D11–D14).
- Detailed 8h parallel team execution plans & contracts created in `docs/plans/` (shads.md, hrittika.md, arko.md) and `docs/contracts/` (seed-bundle.md, api.md).

## In progress
- Sprint execution: Hrittika on datagen & model, Arko on rules & write API stubs, Shads on frontend & sample seed.

## Next 3 actions (per docs/plans/README.md)
1. **Shads**: Build `web/public/seed.sample.json` & `web/src/seed.ts` (Task 0), then build the shell & triage queue (Task 1).
2. **Arko**: Push write-path API stubs (`/api/auth/login`, `/api/batches*`) + run `make gen-types` (Task 1), then implement deterministic rules in `src/rules/` (Task 2).
3. **Hrittika**: Build `datagen/generate.py` with population A & B shifts and cause fingerprints (Task 1).

## Open items
- LICENSE choice (none yet — deliberately unlicensed until decided)
- Hobby-plan terms check (Supabase free tier pauses after 7 days inactivity; re-check before demo day)
- Ignored private docs confirmed: `docs/v2/`, `docs/v3/*.md` (except PROJECT.md, STATE.md, DECISIONS.md), `docs/01-*/`, `docs/02-*/`, `docs/archive/`, `spikes/`, `IDEA_POOL.md`, `CONTEXT*.md`, `*.pdf`, `*.docx`

## Blockers
- None (all contracts frozen; everyone unblocked on sample/stub data).

## Last tool used
write_to_file / replace_file_content (context files standardization)


