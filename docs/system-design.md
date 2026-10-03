# WhyQuiet — System Design

> Status: Approved simplified design (Tier 0 baseline).
> Sources: `docs/PROJECT.md` (incl. AMENDMENTS), `docs/v3/CONTEXT_v3.md`, `docs/DECISIONS.md`.
> Numbers without a URL are **ASSUMED** or **UNVERIFIED**, as marked.

## 1. Problem Statement

For upay's dormant-wallet operations team, having only one signal for dormancy — three weeks without a
transaction — causes the same blanket reactivation message to be sent to five different underlying
problems: **job exit, migration, solved problem, fee shock, supply-side failure**. Each needs a different
remedy, and some need none.

WhyQuiet reads a dormant wallet's transaction shape since acquisition and does one of two things:
1. **Attributes** an underlying churn cause, maps it to a deterministic priced remedy, and provides SHAP-style observable feature contributions.
2. **Refuses** with explicit reasons when the decline shape is ambiguous or uninformative.

Operators then review proposed cause-remedy batches and sign off on remedy budgets under strict human oversight.

Required honesty line (A1/A3): *Real ledgers contain no cause label. We train a multi-cause classifier on
SIMULATED causes (population A) and evaluate it on a SHIFTED population B it has never seen. We claim
robustness to distribution shift in simulation, not real-world accuracy.*

## 2. User Roles & Tenancy

Single tenant: one upay operations console deployment.

| Role | Target Actor | Capabilities | Constraints |
| --- | --- | --- | --- |
| **Viewer / Public (Demo)** | Hackathon judges, internal observers | Full read access: browse triage queue, inspect wallet detail/charts/contributions, view refusal screens, inspect money & evidence reports. | Cannot propose batches, approve spend, or write to audit logs. |
| **Analyst** | upay dormant-wallet ops staff | All viewer capabilities, plus: propose cause-remedy batches for attributed wallets with customer message preview. | Cannot approve batches. Proposer cannot approve their own batch. Cannot override refusals. |
| **Approver** | Ops lead / budget owner | All viewer capabilities, plus: review proposed batches, approve or reject batches with notes. | Cannot approve a batch they proposed. Cannot override refusals. Cannot edit or delete audit logs. |
| **Dormant Customer** | Wallet owner (synthetic) | Never accesses the system. Appears only as pseudonymous ID (`W-XXXXXX`) and message preview recipient. | No live messages are ever dispatched to customers. |

Auth model (D11, D12 resolved):
- **Read paths are public & offline-first** (bundled precomputed seed datasets ensure demo reproducibility without external dependencies).
- **Write paths (propose/approve/reject) are authenticated** via Supabase Auth.
- Role claims (`analyst`, `approver`) live in JWT `app_metadata` (tamper-proof from client) and are verified server-side on write endpoints. Two demo accounts are pre-seeded for evaluation.

## 3. Core User Flows

1. **Triage Queue (Public / Read-only)**
   - Operators view triaged dormant wallets (Population B evaluation slice).
   - Displays pseudonymous ID (`W-XXXXXX`), verdict (`attributed` vs `refused`), top predicted cause, posterior confidence, and rule-baseline comparison.
   - Filter by cause family and verdict.
2. **Wallet Detail & Explainability (Public / Read-only)**
   - Visual transaction decline-shape chart over time.
   - Posterior distribution over all 5 cause families.
   - Top observable feature contributions (LightGBM `pred_contrib` / TreeSHAP).
   - "What the rule baseline would do" comparison indicator.
   - For refused wallets: Dedicated Refusal View displaying why confidence is below threshold $\tau$ or margin is below $\delta$, listing non-discriminating features. Refusals are terminal.
3. **Propose Remedy Batch (Analyst / Authenticated)**
   - Analyst selects an attributed cause family to create a batch proposal.
   - Displays deterministic remedy recommendation, affected wallet count, estimated batch cost (ASSUMED unit cost), and bilingual (Bangla + English) customer message preview.
   - Analyst submits batch (`status: proposed`).
4. **Approve / Reject Batch (Approver / Authenticated)**
   - Approver reviews pending batch, inspects constituent wallets, and approves or rejects with an audit note.
   - Enforces **two-person rule**: Approver ID must differ from Proposer ID (`proposer_id != approver_id`).
   - On approval, the system generates a standardized campaign export payload (JSON/CSV) downloadable for upay's downstream campaign execution engine.
   - Every state transition is written to an immutable, append-only database audit log.
5. **Money & Evidence Report (Public / Read-only)**
   - Economic model: Rule baseline vs Model vs Oracle recovery comparison (`users_recovered × ARPU × ramp − triage_cost`).
   - Sensitivity sweep across 1%, 4%, and 8% recovery rates (all marked ASSUMED).
   - ML rigor panel: Population A-test vs Population B macro-F1, calibration error, shuffled-label control, single-feature leak check.
   - Fairness slices: macro-F1 and refusal rate broken down by worker segment and pay cycle.

## 4. Functional Requirements

### ML & Diagnostics
- **FR-1 (Triage Output):** For any wallet, the system outputs `verdict ∈ {attributed, refused}`, posterior probabilities across 5 cause families, and top feature contributions.
- **FR-2 (Calibrated Refusal):** If $\max(P) < \tau$ or $(P_{(1)} - P_{(2)}) < \delta$, verdict is `refused`. Refusals are first-class valid diagnostic outcomes, never errors. Refusal rate on Population B must be strictly $> 0\%$.
- **FR-3 (Rule Baseline Comparison):** Every wallet result includes the deterministic 3-week silence rule output alongside the model attribution.
- **FR-4 (Circularity Barrier):** `src/model` must never import or read `truth/`. Automated CI tests strictly enforce this boundary.

### Remedy & Campaign Hand-off
- **FR-5 (Deterministic Remedy Catalog):** Cause-to-remedy mapping is hardcoded in deterministic code (`src/rules`), with costs and expected recovery values loaded from documented assumptions (`economics.md`).
- **FR-6 (Batch Lifecycle):** Batches transition `proposed` $\to$ `approved` | `rejected`. A wallet may belong to at most one open/proposed batch at a time.
- **FR-7 (Campaign Export):** Approved batches produce an exportable JSON/CSV payload containing `{batch_id, cause, remedy, wallet_ids, cost, approved_by, timestamp}`. No live SMS/push messages are dispatched.
- **FR-8 (Message Preview):** Previews render the remediation template in both Bangla and English.

### Security, Audit & Identity
- **FR-9 (Immutable Audit Log):** Audit events record `actor_id`, `role`, `action`, `target_id`, `metadata`, and `timestamp`. Database triggers prevent `UPDATE` and `DELETE` operations on audit tables.
- **FR-10 (Two-Person Separation):** The backend rejects any batch approval where `approver_id == proposer_id`.
- **FR-11 (Zero Real/Fake PII):** No phone numbers, names, or national IDs are stored or displayed. All entities use pseudonymous identifiers (`W-XXXXXX`).

## 5. Non-Functional Requirements

### Performance & Scalability
- **Demo Response Time:** All read screens load in $< 500\text{ ms}$ from static precomputed JSON/Parquet seed bundles.
- **Production Architecture Target:** 1.27M wallets/year triaged via scheduled offline batch scoring jobs (ASSUMED, from `economics.md`), completely decoupling inference latency from operator UI performance.
- **Bundle Efficiency:** Inference models remain offline/precomputed in seed data to keep serverless function size well under Vercel's 500 MB limit.

### Availability & Resilience
- **Offline-First / Zero External Runtime Dependency (D6):** The web console and API serve demo evaluations directly from bundled seed data. If Supabase is unreachable or paused, read-only triage and evidence reports remain 100% operational. Write actions fail gracefully with actionable error messaging.

### Security & Responsible AI (Hackathon §14)
- **Input Validation:** All endpoints validate strictly via Pydantic v2 schemas.
- **Role-Based Access Control:** Supabase Auth JWT claims verified server-side on all state-modifying endpoints.
- **No Black-Box Automation:** AI never authorizes financial remedies autonomously; every dollar of remedy budget requires human approver sign-off.
- **Explainability & Transparency:** Every prediction displays feature-level SHAP contributions, explicit assumptions, and baseline comparisons.

## 6. Out of Scope

- Direct dispatch of SMS, push notifications, or USSD prompts to live mobile networks.
- Ingestion of real production upay customer data or PII.
- Multi-tenancy or cross-organization SaaS features.
- Billing, subscription plans, and external payment gateway integrations.
- Operator override of refusal decisions (refusals are terminal).
- Live real-time stream scoring of active transactions.

## 7. Delivery Phasing (Tier 0 vs Tier 1)

### Tier 0 (Mandatory by Hour 24 — Baseline Demo)
- Synthetic data generator (Populations A and B with 5 cause families and shift parameters).
- Deterministic baseline rule engine (`src/rules`).
- 5-family LightGBM classifier with native TreeSHAP contribution extraction and calibrated refusal gate.
- Public read-only Cause Desk UI (Queue, Wallet Detail, Refusal Screen, Money & Evidence Report).
- Authenticated Batch Propose $\to$ Two-Person Approve flow with exportable campaign payload.
- Append-only audit logging in Supabase (with graceful offline fallback).
- Bilingual Bangla/English customer message preview.
- README, live Vercel URL, reproducibility test suite, and minimal fairness check.

### Tier 1 (Hours 24–48 — Depth & Polish)
- Adversarial robustness testing (evaluating model behavior under simulated deceptive shapes).
- Deeper demographic/geographic fairness slice visualizations.
- Extended economic sensitivity interactive playground.
- Demo video recording and final technical report deliverables.
