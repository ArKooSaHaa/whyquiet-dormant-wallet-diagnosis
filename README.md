# WhyQuiet — Dormant-Wallet Diagnosis (Cause Desk)

> **"A wallet going quiet is five diseases, and upay only has one thermometer."**

WhyQuiet is a dormant-wallet diagnostic console built for mobile financial service (MFS) operations teams. When an MFS user becomes inactive, traditional systems apply a blunt rule: *3 weeks without a transaction &rarr; send a blanket reactivation SMS to everyone*.

However, dormancy is driven by **five distinct underlying root causes**:
1. **Job Exit** (e.g. factory salary deposit stopped abruptly)
2. **Migration** (e.g. user moved districts and lost access to local cash points)
3. **Solved Problem** (e.g. one-off tuition or festival remittance completed)
4. **Fee Shock** (e.g. abandonment following tariff changes or high cash-out charges)
5. **Supply-Side Failure** (e.g. repeated failed transactions at liquidity-starved agent counters)

WhyQuiet analyzes the 26-week transaction decline shape of inactive user wallets, attributes the most probable churn cause with calibrated confidence, maps it to a targeted remedy with bilingual message copy, calculates economic recovery trade-offs, and **calibratedly refuses** to act when transaction signals are ambiguous.

---

## 🎯 The Mandatory Honesty Line (AMENDMENTS A1 & A3)

> *"Real ledgers contain no cause label. We train a multi-cause classifier on SIMULATED causes (population A) and evaluate it on a SHIFTED population B it has never seen. We claim robustness to distribution shift in simulation, not real-world accuracy."*

> *"The causes are simulated. What we show is that attribution survives a population the model never saw and that it refuses when the shape is ambiguous. Whether real causes look like ours is exactly what real upay data would answer first."*

---

## 🚀 Live Demo & Access

- **Live Application URL**: [https://whyquiet.vercel.app](https://whyquiet.vercel.app)
- **Public Read Console**: The diagnostic queue, wallet details, decline shapes, posterior charts, refusal proofs, and economic simulations are completely public and offline-first from bundled seed data (zero login required).
- **Governance & Batch Write Access**:
  - `analyst@whyquiet.demo` (Role: `analyst` — proposes cause-targeted batches)
  - `approver@whyquiet.demo` (Role: `approver` — reviews batches, enforces two-person approval, downloads campaign payloads)
  - *Demo credentials are provided to judges in the competition submission portal (never stored in git).*

---

## 🏛️ System Architecture

```
Hrittika                         Arko                              Shads
datagen/ -> src/model/ ->        src/rules/ (baseline, remedies,   web/
scripts/export_seed.py  --uses-> money)                            reads web/public/seed.json  (all read screens)
        |                        src/api/ + supabase/ (batches)    calls /api/* (login, batches) only
        +--> web/public/seed.json ------------------------------->
```

1. **Synthetic Data Engine (`datagen/`)**: Generates 6,000 wallets in Population A (train/test split) and 3,000 wallets in Population B with real-world distribution shift (different pay cycles, noise levels, prior mixes, holiday calendars, and channel preferences). Labels for A-test and Population B go exclusively to `truth/` (never imported by `src/model/`).
2. **Deterministic Rules (`src/rules/`)**: Implements the baseline reactivation heuristic (`rule_baseline`), priced cause remedies (`REMEDIES` with English and Bengali copy), and the economic sensitivity simulation (`money_table`).
3. **ML Classifier & Calibrated Refusal (`src/model/`)**: Extracts 20 decline-shape features and trains a LightGBM classifier with tree SHAP contributions (`pred_contrib`). Refuses whenever top posterior $\tau < 0.80$ or margin $\delta < 0.10$.
4. **Write-Path API & Governance (`src/api/` & `supabase/`)**: FastAPI server backed by Postgres triggers on Supabase. Enforces strict authentication, role-based authorization, two-person approval integrity (`proposer != approver`), single-open-batch uniqueness per wallet, and an immutable append-only audit log.
5. **Operator Console (`web/`)**: High-agency React 19 + TypeScript + Tailwind CSS + Recharts interface with custom Claymorphic shape and Neumorphic dark/light palette.

---

## 📊 Experimental Results (Population B Validation)

All headline metrics are evaluated on **Population B (3,000 wallets)** under distribution shift:

### 1. ML Rigor & Control Benchmarks

| Metric / Benchmark | Value | Context & Meaning |
| :--- | :--- | :--- |
| **Headline Macro-F1 (Population B)** | **0.8636** (86.4%) | Attributed wallets under unseen distribution shift (Seeds 1–3: 0.868 mean, 0.847–0.886 range) |
| **Population A Test Macro-F1** | **0.9618** (96.2%) | In-distribution test performance |
| **Generalization Gap ($A_{\text{test}} - B$)** | **0.0983** (9.8%) | Robust transfer across shifted demographic and noise conditions |
| **Refusal Rate on A-Test** | **9.33%** (112 / 1,200) | Calibrated refusal on ambiguous training-distribution wallets |
| **Refusal Rate on Population B** | **21.73%** (652 / 3,000) | Refusal rate rises under higher noise/ambiguity (as designed) |
| **Expected Calibration Error (ECE on B)** | **0.1001** (10.0%) | 10-bin posterior calibration across all classes |
| **Rule Baseline Macro-F1 on B** | **0.0819** (8.2%) | Constant majority class baseline from A-train (`job_exit`) |
| **Shuffled-Label Control on B** | **0.1621** (16.2%) | Permuted label control ($\approx 0.20$ chance level) |
| **Best Single Feature Macro-F1 on B** | **0.3730** (37.3%) | Single-feature decision tree (`cashin_ratio_last4` $\ll$ 0.864 full model) |

### 2. Subgroup Fairness & Demographic Parity on Population B

| Slice | Subgroup | Wallet Count ($n$) | Macro-F1 | Refusal Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Worker Type** | `domestic` | 765 | 0.8755 | 23.79% |
| | `garment` | 698 | 0.8911 | 21.78% |
| | `retail` | 554 | 0.8493 | 17.87% |
| | `transport` | 983 | 0.8421 | 22.28% |
| **Pay Cycle** | `biweekly` | 586 | 0.8804 | 20.99% |
| | `monthly` | 1,824 | 0.8560 | 23.19% |
| | `weekly` | 590 | 0.8638 | 17.97% |

*Result: Macro-F1 remains balanced across occupational groups (0.842–0.891) and payment frequencies (0.856–0.880) without disparate impact.*

---

## 💰 Economic Recovery Simulation (`src/rules/money.py`)

*Economic recovery across 3,000 triaged wallets in Population B under 1%, 4%, and 8% recovery rates:*

| Recovery Rate | Strategy | Actioned Wallets | Recovered Users | Cost (BDT) | Net Economic Value (BDT) |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **1% (Pessimistic)** | Rule Baseline | 3,000 | 7.5 | 1,500.00 | **+1,200.00** |
| | **WhyQuiet Model** | **2,348** | **21.1** | **25,828.00** | **-18,231.10** |
| | Oracle (Upper Bound) | 3,000 | 30.0 | 33,000.00 | -22,200.00 |
| **4% (Base Case)** | Rule Baseline | 3,000 | 30.0 | 1,500.00 | **+9,300.00** |
| | **WhyQuiet Model** | **2,348** | **84.4** | **25,828.00** | **+4,559.60** |
| | Oracle (Upper Bound) | 3,000 | 120.0 | 33,000.00 | +10,200.00 |
| **8% (Optimistic)** | Rule Baseline | 3,000 | 60.0 | 1,500.00 | **+20,100.00** |
| | **WhyQuiet Model** | **2,348** | **168.8** | **25,828.00** | **+34,947.20** |
| | Oracle (Upper Bound) | 3,000 | 240.0 | 33,000.00 | +53,400.00 |

### Documented Financial Assumptions
- **ASSUMED**: Average monthly revenue per active wallet (ARPU) is **120.0 BDT**.
- **ASSUMED**: Reactivated users generate a **3.0-month** active lifetime value multiplier (RAMP).
- **ASSUMED**: Generic SMS broadcast is **25%** as effective as cause-targeted remedies.
- **ASSUMED**: Generic SMS broadcast unit cost is **0.50 BDT** per wallet.
- **ASSUMED**: Cause-targeted remedies average **11.0 BDT** unit cost across causes (`job_exit`: 15 BDT, `migration`: 10 BDT, `solved_problem`: 0 BDT, `fee_shock`: 25 BDT, `supply_failure`: 5 BDT).
- **ASSUMED**: Sensitivity analysis sweeps recovery rates across 1%, 4%, and 8%.

---

## 🛡️ Responsible AI & Governance Safeguards

1. **Human-in-the-Loop Batch Approval**: WhyQuiet never triggers customer messaging automatically. The AI identifies patterns and compiles candidate batches; human operations personnel must review and sign off.
2. **Two-Person Rule (Maker-Checker)**: A batch proposed by an analyst can only be approved or rejected by a separate approver (`proposer != approver`). Enforced both in the FastAPI authorization layer and as a Postgres database trigger.
3. **Calibrated Refusal as a First-Class Output**: Ambiguous wallets receive the verdict `"refused"` with plain-English mathematical reasons (e.g. *"Top cause fee_shock 0.45 is below the 0.80 bar (tau)"*). Refusals are terminal and cannot be overridden into active remedy batches.
4. **Zero PII & Data Minimization**: All wallet data is pseudonymous (`W-XXXXXX`). No customer phone numbers, national IDs, or physical addresses exist in the repository or database.
5. **No Live Dispatch Gate**: Output is restricted to structured campaign exports (JSON/CSV) for integration into scheduled MFS outbound platforms. No automated external webhooks are exposed.
6. **Immutable Audit Trail**: All governance actions (`batch.propose`, `batch.approve`, `batch.reject`) append to a strictly immutable audit log table where SQL `UPDATE` and `DELETE` are blocked by database triggers.

---

## ⚖️ Compliance & Consent Block

- **Synthetic Data Notice**: All data utilized in this project, including transaction amounts, timestamps, worker categories, and decline shapes, is 100% synthetically generated via `datagen/generate.py`.
- **No Real Customer Records**: No proprietary, confidential, or personally identifiable information (PII) from bKash, Nagad, upay, or any other financial institution was used or accessed.
- **Safety**: No real SMS messages, promotional vouchers, or communications are ever sent to live telecommunications networks.

---

## 💻 Local Development & Verification

### Prerequisites
- Python 3.12+ with `uv`
- Node.js 20+ with `npm`

### Installation & Run
```bash
# 1. Clone repository
git clone https://github.com/shads-01/whyquiet-dormant-wallet-diagnosis.git
cd whyquiet-dormant-wallet-diagnosis

# 2. Python environment & dependencies
uv sync

# 3. Frontend dependencies
cd web && npm install && cd ..

# 4. Secrets for the write path (login, batches): fill in .env, never commit it
cp .env.example .env

# 5. Run local development servers (API on :8008, Web on :5173)
make dev
# Without make (e.g. Windows), two terminals:
#   uv run --env-file .env uvicorn src.api.main:app --port 8008
#   cd web && npm run dev
```

### Verification & Quality Gate
```bash
# Run full linting, static typing, unit tests, contract checks, and production builds:
make check

# Run complete Playwright end-to-end suite:
make e2e
```

### Deployment & CI/CD
```bash
# Deploy happens automatically after CI passes on main. Manual deploy via CLI:
make deploy

# Verify live deployment:
make verify-deploy URL=https://whyquiet.vercel.app
```
See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the complete guide on GitHub Actions CI/CD workflows, GitHub Secrets, and Supabase environment variables.

---

## 📁 Repository Structure

```
whyquiet-dormant-wallet-diagnosis/
├── api/                   # Vercel serverless Python entrypoint
├── datagen/               # Synthetic population generator (Pop A & Pop B)
├── docs/                  # Architectural specs, plans, contracts & DECISIONS.md
├── scripts/               # Export tools (seed.json, openapi.json, evaluate.py)
├── src/
│   ├── api/               # FastAPI write-path endpoints, schemas, auth, and store
│   ├── model/             # 20 shape features, LightGBM classifier, refusal logic
│   └── rules/             # Deterministic rules (baseline.py, remedies.py, money.py)
├── supabase/
│   ├── migrations/        # Postgres schema, triggers, two-person rule, immutable audit
│   └── seed_demo_users.py # Idempotent demo account provisioner
├── tests/                 # 88 unit & integration tests (TDD, no-truth-leak verification)
└── web/                   # Vite + React 19 + TypeScript + Tailwind + Recharts console
```
