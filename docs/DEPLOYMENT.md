# WhyQuiet Deployment Guide (Vercel + Supabase)

This document provides complete, step-by-step instructions for deploying WhyQuiet to Vercel with serverless Python API functions and Vite/React frontend.

---

## Architecture Overview

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS (static bundle in `web/dist`).
- **Backend API**: FastAPI running on Python 3.12 Serverless Functions (`api/index.py`).
- **Database & Auth**: Supabase Postgres + Supabase Auth.
- **Offline Fallback**: Bundled `seed.json` guarantees 100% of read paths (Queue, Wallet Detail, Evidence, Reports) work instantly even if the database is paused or offline.

---

## Option 1: One-Command Deployment via Vercel CLI

### Prerequisites
1. Node.js 20+ and Python 3.12 (`uv`).
2. Logged in to Vercel CLI:
   ```bash
   npx vercel login
   ```

### Deploy
Run the production deploy command:
```bash
make deploy
# Or directly:
npx vercel --prod
```

When prompted by Vercel for project configuration:
- **Set up and deploy?** `yes`
- **Which scope?** `<your-team-or-personal-account>`
- **Link to existing project?** `no` (or `yes` if already created)
- **Project name:** `whyquiet-dormant-wallet-diagnosis`
- **Directory located?** `./` (root)
- **Want to modify settings?** `no` (`vercel.json` handles build & install commands automatically)

---

## Option 2: Automated CI/CD via GitHub Actions

The repository includes pre-configured GitHub Actions workflows in `.github/workflows/`:
- **`ci.yml`**: Runs on every pull request and push. Executes `make check` (ruff, pyright, pytest, openapi typegen, tsc, oxlint, vite build) and `make e2e` (Playwright tests).
- **`deploy.yml`**: Runs on push to `main` (and manual `workflow_dispatch`). Validates the entire test suite, deploys to Vercel, and verifies live health.

### Required GitHub Secrets
To enable automated deployments from GitHub Actions, add the following secrets to your GitHub repository under **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Where to find |
|-------------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel Personal Access Token | [Vercel Account Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel Organization / User ID | In `.vercel/project.json` (after `npx vercel link`) or Vercel Team Settings |
| `VERCEL_PROJECT_ID` | Vercel Project ID | In `.vercel/project.json` (after `npx vercel link`) or Vercel Project Settings > General |

> **Tip:** You can obtain `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` by running `npx vercel link` once locally and viewing `.vercel/project.json`.

---

## Environment Variables Configuration (Vercel Dashboard)

Under **Vercel Dashboard > Your Project > Settings > Environment Variables**, configure the following variables for the Production and Preview environments:

| Variable Name | Required? | Description |
|---------------|-----------|-------------|
| `SUPABASE_URL` | Yes (for write path) | Your Supabase project URL (e.g. `https://xyz.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for write path) | Service role secret key (server-side only, bypasses RLS) |
| `SUPABASE_ANON_KEY` | Yes (for write path) | Anon public key |
| `DEMO_ANALYST_PASSWORD` | Optional | Demo login password for `analyst@whyquiet.demo` |
| `DEMO_APPROVER_PASSWORD` | Optional | Demo login password for `approver@whyquiet.demo` |

*Note: If Supabase variables are not set, read-only screens still function 100% via seeded offline data, and write-path calls return a 503 with a graceful in-app banner.*

---

## Post-Deployment Health Verification

After deployment, verify that all endpoints and static assets are live and responding:

```bash
# Verify against production URL
make verify-deploy URL=https://whyquiet.vercel.app

# Or verify with optional offline fallback allowed:
make verify-deploy URL=https://whyquiet.vercel.app FLAGS=--allow-offline
```

The verification script checks:
1. `GET /api/health` -> Returns `200 OK` with JSON status `"ok"`.
2. `GET /api/openapi.json` -> Returns `200 OK` OpenAPI schema.
3. `GET /api/batches` -> Returns `200 OK` (or `503` if Supabase offline).
4. `GET /` -> Returns `200 OK` with HTML title containing "WhyQuiet".

---

## Supabase Database Setup & Migrations

If setting up a fresh Supabase instance for the write path:
1. Apply the migration:
   ```bash
   # Using Supabase CLI:
   supabase db push
   # Or paste the SQL in Supabase SQL Editor:
   # supabase/migrations/20261003215000_remedy_batches.sql
   ```
2. Seed the demo users (`analyst@whyquiet.demo`, `approver@whyquiet.demo`):
   ```bash
   uv run python supabase/seed_demo_users.py
   ```
