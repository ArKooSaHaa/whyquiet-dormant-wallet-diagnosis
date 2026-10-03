# WhyQuiet — 8-hour team plan (read this first)

> Status: PROPOSAL (D17). Replaces the 24/48h timeline in `docs/PROJECT.md` for this event.
> Personal plans: [shads.md](shads.md) · [hrittika.md](hrittika.md) · [arko.md](arko.md)
> Contracts (the only handoffs): [seed-bundle.md](../contracts/seed-bundle.md) · [api.md](../contracts/api.md)

## The shape of the system in one picture

```
Hrittika                         Arko                              Shads
datagen/ -> src/model/ ->        src/rules/ (baseline, remedies,   web/
scripts/export_seed.py  --uses-> money)                            reads web/public/seed.json  (all read screens)
        |                        src/api/ + supabase/ (batches)    calls /api/* (login, batches) only
        +--> web/public/seed.json -------------------------------> 
```

- **Read path = one static JSON file.** No API or DB needed to demo queue, wallet, refusal, money report.
- **Write path = Arko's API + Supabase.** Login, propose, approve/reject, export.
- **Ownership is by directory.** Don't edit another person's directory; ask them.

| Owner | Directories |
| --- | --- |
| Shads | `web/**` |
| Hrittika | `datagen/`, `src/model/`, `truth/`, `data/`, `scripts/export_seed.py`, `tests/test_model*.py`, `tests/test_datagen*.py` |
| Arko | `src/rules/`, `src/api/`, `api/`, `supabase/`, `tests/test_rules*.py`, `tests/test_api*.py`, `README.md`, `Makefile`, `vercel.json`, CI |

## Timeline (H0 = start; ~8h)

| Time | Hrittika | Arko | Shads |
| --- | --- | --- | --- |
| H0–0.5 | Read contracts, ack in chat | Read contracts; start **API stubs → push by H1** | Read contracts, write `seed.sample.json` |
| H0.5–2 | Generator A + B, `truth/` split | **Rules** (baseline, remedies, money) → push by **H2** | Shell, queue, wallet detail on sample |
| H2–4 | Features + LightGBM + refusal + contributions | Migration, then real batch endpoints | Charts, refusal screen, money & evidence page |
| **H4 GATE** | **Model beats rule on B macro-F1?** (see hrittika.md) | | |
| H4–5 | Eval report + fairness + **push `seed.json` by H5** | Auth/login, two-person rule, tests | Login + propose/approve UI against stubs |
| H5–6.5 | Shuffled control, single-feature check, tune tau/delta | Deploy w/ Supabase env, seed demo accounts | Swap to real `seed.json`, wire live API, e2e |
| H6.5–7.5 | Numbers into README "Results" section (send to Arko) | README, report, consent block | Polish, demo script, rehearse |
| **H7.5** | **FREEZE — bug fixes only** | | |
| H7.5–8 | Rehearse demo together; final deploy; submit | | |

## Cutlines (decided now so nobody argues at H6)

1. Behind at H4 → **Arko** drops `/reject` and `/export` CSV, keeps propose + approve + JSON export.
2. Behind at H5 → **write path is cut entirely**; Shads shows the batch preview (remedy, count, cost, bilingual message) read-only from `seed.json`. The demo still works.
3. Model fails the H4 gate → do NOT switch ideas (no time). Cut to the causes that separate (e.g. 3 families), report that honestly, keep refusal. Hrittika decides, logs in DECISIONS.md.
4. Never cut: refusal screen, B-population headline + rule baseline + shuffled control, ASSUMED labels on money.

## How everyone works with agentic tools (any tool: Antigravity, Claude Code, OpenCode, Cursor…)

**One-time setup (5 min):**
1. `git pull`. Open your tool **at the repo root**. It automatically reads `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` (same content).
2. Make sure the **superpowers** and **ponytail** skills are installed in your tool (Shads has both; copy his setup if yours lacks them). Check by asking the agent: *"List the skills you have."*
3. Python: `uv sync` (and `uv sync --group offline` for Hrittika). Web: `cd web && npm install`.

**Per task loop (this is the whole method):**
1. Paste the task's **Prompt** from your plan into a *fresh* chat (new chat per task = clean context).
2. The prompt tells the agent to use these skills in order:
   - `ponytail` (full): simplest working solution, no new deps, no speculative code.
   - `superpowers:test-driven-development`: failing test first, then code, then green.
   - `superpowers:systematic-debugging`: when something breaks, before guessing at fixes.
   - `superpowers:verification-before-completion`: run the check command and show output before saying "done".
3. Review the diff yourself (2 min). Reject anything outside your directories.
4. Run your check, then commit + push to `main` small and often:
   - Python owners: `uv run ruff check src tests datagen scripts api && uv run pyright && uv run pytest -q`
   - Shads: `cd web && npx tsc -b --noEmit && npx oxlint src e2e && npx vite build`
5. If the agent made a design decision, append a row to `docs/DECISIONS.md` (next free id; pull first to avoid id clashes).

**Branching for 8 hours:** push straight to `main` in small commits, each touching only your directories.
Conflicts are near-impossible because directories don't overlap. `DECISIONS.md` is the only shared file:
always `git pull --rebase` before appending.

**When you're blocked by someone:** don't wait. Use the sample file (`seed.sample.json`) or the API stubs,
and keep going. Post in chat: what you need, by when.

**Asking before new dependencies (AGENTS.md rule):** the plans need **zero** new dependencies. If an agent
wants to add one, it must ask in chat first.
