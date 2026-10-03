# Project: WhyQuiet - Dormant-wallet diagnosis

## What this product does
WhyQuiet is a dormant-wallet diagnostic console (Cause Desk) for mobile financial service (MFS) operations teams. It triages inactive user wallets by analyzing transaction decline shapes to distinguish five distinct underlying churn causes with calibrated refusal when data is ambiguous. It replaces blanket reactivation messages with cause-targeted remedies and economic recovery calculations.

## Stack (do not change without asking)
- Frontend: Vite + React 19 + TypeScript + Tailwind CSS + Recharts
- Backend: Python 3.12 + FastAPI + Pydantic v2 + LightGBM + scikit-learn
- Database: Postgres via Supabase (triage audit log) / Parquet (offline data), ORM: None (Supabase Python client)
- Auth: Supabase Auth (writes: batch propose/approve) / None (public read-only demo)
- Hosting: Vercel (web frontend + serverless Python API functions) + Supabase (database)

## Rules
- Never commit secrets. All secrets go in environment variables, documented in .env.example.
- Every new API endpoint needs: input validation, auth check, authorization check, tests.
- Every database change goes through a migration file. Never edit the DB by hand.
- Run lint, typecheck and tests before saying a task is done (`make check` green).
- Never commit, amend, cherry-pick, push, or move a branch ref until the user explicitly says to in their current message. Leave changes uncommitted and ask.
- Ask before adding a new dependency.
- Prefer small, reviewable changes. One feature per branch.
- **Mandatory Ponytail**: All 3 collaborators and agentic tools (Antigravity, OpenCode, Claude Code) MUST use ponytail principles for EVERY feature — radical minimalism, YAGNI, standard library and native platform features before custom abstractions or dependencies, zero speculative bloat.
- **Record All Decisions**: Every architectural, design, stack, or scope decision made with agentic tools MUST be recorded immediately in `docs/DECISIONS.md` (append-only table with id, decision, and reason).
- Never invent facts or numbers. Claims need a URL, otherwise mark UNVERIFIED. Unsourced inputs are ASSUMED.
- Data is synthetic only. Population A trains; population B and truth/ are eval-only. `src/model` must never import `truth/`.
- Business rules are deterministic code in `src/rules`, separate from ML. No sensitive decision logic inside an LLM prompt.
- Refusal ("No attributable cause") is a first-class output with reasons, never an exception.
- Headline accuracy is population B only. Always report rule baseline and shuffled-label control beside it.
- Do not delete files. No new features after hour 42 (bug fixes only).

## Commands
- Dev: `make dev` (or `uv run --env-file .env uvicorn src.api.main:app --port 8008` & `cd web && npm run dev`)
- Test: `uv run pytest -q && make e2e`
- Lint/typecheck: `make check` (`uv run ruff check src tests datagen scripts api && uv run pyright && cd web && npx tsc -b --noEmit && npx oxlint src e2e && npx vite build`)
- Migrate: `supabase migration new <name>` and apply via Supabase CLI / migration files in `supabase/migrations/`
- Typegen: `make gen-types` (`uv run python scripts/export_openapi.py && cd web && npx openapi-typescript src/api/openapi.json -o src/api/schema.d.ts`)

## Architecture decisions
See docs/DECISIONS.md and docs/PROJECT.md for the log of decisions and why they were made. Every technical or design decision made by any collaborator or agent must be appended to docs/DECISIONS.md.
