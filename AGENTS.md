# Project: WhyQuiet - Dormant-wallet diagnosis (DIU CPC x upay AI Hackathon 2026)
Goal: win with a working prototype built by 3 people. Judges: technical, business, executive.
Scoring: relevance 20, AI/ML depth 20, business impact 20, prototype 15, innovation 10, scalability 10, responsible AI 5.

## Read first
- docs/PROJECT.md = locked spec (its AMENDMENTS section wins any conflict). docs/STATE.md = where we are.
  docs/DECISIONS.md = why. Read STATE.md at session start; update it (hour, done, next 3 actions, last tool) before ending.

## Commands
- `make dev`: run local backend (:8000) and frontend (:5173)
- `make check`: run linters (ruff, pyright), pytest, type-generation, diff check, tsc, oxlint, and build
- `make e2e`: run Playwright end-to-end tests against dev servers
- `make gen-types`: export FastAPI openapi.json and generate TypeScript definitions in web/
- `make demo`: run/print demo status
- `make verify-deploy URL=<url>`: run verification script against deployed endpoint

## Definition
- `make check` green before reporting any task done.

## Hard rules
1. Never invent facts or numbers. External claims need a URL, otherwise mark UNVERIFIED. Unsourced inputs are ASSUMED.
2. Do not change the idea, scope, stack, numbers or amendments. If something must change, add a proposal row to
   docs/DECISIONS.md and stop. The human decides.
3. Data is synthetic only. No real personal data. Population A trains; population B and truth/ are evaluation only.
4. src/model must never import or read truth/. Keep the import-guard test passing.
5. Business rules (refuse/act, budgets, thresholds) are deterministic code in src/rules, separate from ML.
   No sensitive decision logic inside an LLM prompt.
6. Refusal ("No attributable cause") is a first-class output with reasons, never an exception.
7. Every API response carries reasons (feature contributions) and separates prediction / assumption / generated text.
8. Forbidden claims: "label-free", "real-world accuracy", "validated on real data". Required framing: simulated causes,
   shift-tested on an unseen population.
9. Headline accuracy is population B only. Always report the rule baseline and the shuffled-label control beside it.
10. No fraud, scam, phishing, mule or AML features. Out of scope.
11. Do not delete files. No new features after hour 42 (bug fixes only).

## Layout
datagen/ | data/train/ | truth/ (eval-only) | src/model | src/rules | src/api (FastAPI) | web/ | tests/ | docs/

## Done means
Runs from a clean clone with the README commands; tests pass; rule baseline and model share one interface; money report
compares rule vs model vs oracle on population B; Tier 0 checklist in docs/STATE.md fully ticked by hour 24.

## Style
Small commits, continuous history. Boring readable code. Reply concisely. Do not restate this file.

