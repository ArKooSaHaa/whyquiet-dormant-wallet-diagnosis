AMENDMENTS (bottom of this file) OVERRIDE ANY CONFLICTING TEXT ABOVE THEM.

# upay Cause Desk (F1) — locked spec

Everything below is copied VERBATIM from `docs/v3/finalists.md` (F1 section). Where the copied text
conflicts with the AMENDMENTS at the bottom, the AMENDMENTS win.

## F1 — Silent-Churn Triage (Cause Desk)

### Official one-page logic chain

| Step | Answer |
| --- | --- |
| **1. User** | upay's dormant-wallet operations team (primary); the dormant customer (secondary). Persona: a garment worker whose wallet is active on payday and silent for eleven weeks afterwards. |
| **2. Problem** | upay has exactly one signal for dormancy — three weeks without a transaction — and that gap is **five different diseases with five different remedies**: job exit, migration, a solved problem, a fee shock, a supply-side failure. Today upay either treats all five identically or treats none. |
| **3. Why now** | 237m registered MFS accounts at Dec 2024 with only **37.6% active** (S1, TIB/BB); **42.5% of users transact once or twice a month** (S12, 2018 survey of 442 users). upay's own base is 8.5m registered, modelled at 3.63m dormant (`economics.md` §1.2). Crucially, **the label does not exist** — cause of dormancy is not a column in any ledger, so this cannot be bought off the shelf. |
| **4. Solution** | **Cause Desk** — an internal console that reads a dormant wallet's entire transaction *shape* since acquisition, attributes a cause where one is attributable, maps cause → remedy, prices the remedy, and **refuses** where no cause is attributable. |
| **5. AI role** | **Label-free multi-cause classification of the decline shape.** The generator knows the true cause; the model never sees that label. Output is a posterior over cause families plus the feature contributions that drove it (SHAP-style, per brief §14 explainability). |
| **6. Impact + target** | **Recovered dormant wallets as a share of the triaged base. Target ≥1.9%** on a 35% triaged base (≈24,000 users, 0.66% of the dormant base) — the stated break-even. Secondaries: cause-attribution accuracy (target ≥50%) and **share refused as "no attributable cause"** — the credibility metric, not a performance metric. |
| **7. Data** | Synthetic only (brief §11). Customers, transactions with types, devices/locations/timestamps/channels, cases. Ground-truth cause written to a **separate file never read by training**. Deliberate traps: job-exit, holiday-quiet, solved-once, fee-shock, supply-blocked. Clean held-out split, never trained on. |
| **8. Validation** | Offline: macro-F1 over five cause families on held-out synthetic. **Then money, not accuracy:** `users_recovered × ARPU × ramp − triage_cost`, for rule vs model vs oracle. The rule baseline is **"3 weeks silent → reactivation message to everyone."** Report the cases **where the rule was right** — a model that never loses to a threshold is not believable. |
| **9. Scale** | Real upay data would add three things we lack: inter-FS visibility (to see whether a "recovered" wallet just moved to bKash), campaign-response ground truth, and eKYC-verified identity for employer/travel causes. Module seams are data-prep / inference / business-rule separated per brief §12, so a warehouse drop swaps the generator and nothing else. |

### Problem statement (official format)

> For upay's dormant-wallet operations team, having only one signal for dormancy — three weeks without a
> transaction — causes the same blanket reactivation message to be sent to five different underlying
> problems, so an entire Tk 2.1 crore modelled recovery rests on a 4% recovery rate that no evidence
> supports in either direction.

### The three things a judge remembers

- **One sentence:** *"A wallet going quiet is five diseases, and upay only has one thermometer."*
- **One taka number:** **Tk 2.1 crore base case — 4.8% of upay's FY2023 revenue — from diagnosing 1.27 million triaged wallets for Tk 18 lakh.** It is the only idea in the set that reaches a large fraction of the dormant base cheaply.
- **One demo moment:** the judge asks to see a wallet the tool *refuses* to act on. The screen shows 22 features, none of which discriminate, and the verdict: **"No attributable cause. I will not spend your money here."**

### 48-hour build plan

| Hours | P1 — data & model | P2 — API & rules | P3 — web, demo, deliverables |
| --- | --- | --- | --- |
| **0–2** | Scaffold repo; `datagen/` skeleton; write the 5 cause families and their observable fingerprints | Repo scaffold; FastAPI skeleton with `/profile /triage /explain /refuse` stubs | Repo scaffold; wire a "judge can try this" URL; README skeleton with all §9 headings |
| **2–6** | **Generator complete**: population with heterogeneous pay cycles, ground-truth cause written to `truth/` (never imported by training), traps, held-out split | Deterministic **rule baseline** — "3 weeks silent → message everyone" — behind the same interface as the model | Triage list UI against the rule baseline. Working demo by hour 6, even though the model does not exist yet |
| **6–8** | **HOUR-6 GATE:** generator produces held-out ground truth and the calibration sanity-check passes | Rule baseline end-to-end; money calculator wired to `economics.md` U3 | Demo script v1 written against the *rule* |
| **8–12** | Model: shape features → 5-family classifier; calibration on held-out | `/explain` returns SHAP contributions, not just a label (brief §12 traceability) | Console shows decline shape + contributions |
| **12** | 🛑 **KILL SWITCH — see below** | | |
| **12–20** | Multi-seed runs; money report vs rule vs oracle; sensitivity on the 4% recovery assumption | Refusal path as a first-class API response, not an exception | Refusal screen — the money shot. Commit history continuous |
| **20–24** | ✅ **Pre-evaluation-ready.** Freeze v1. Tag release | OpenAPI docs; every response carries reasons | **README + live deploy up. Project report drafted** |
| **24–36** | Fairness check across relevant groups (brief §14); adversarial cases: what if the wallet is quiet *because* the model is wrong | Idempotent `/triage`; logging so the demo is reproducible | Video demo script and recording; requirement-drop absorber documented |
| **36–42** | Second population variant so a requirement drop is "change the population" | | |
| **42–48** | Bug fixes only; no new features | | README/report/video final; deploy; rehearse all three members |

**🛑 Hour-12 kill switch — go/no-go, decided by the pre-committed test, not by how the day felt.**
Continue **only if both** hold: (1) the classifier beats the deterministic rule on **macro-F1 over the five
cause families on held-out data**, and (2) the **money** report shows model ≥ **25% better money per
recovered wallet** than the rule. If (1) fails but (2) passes, we have mis-attributed causes and a
recoverable product → cut to two cause families and re-run. If (2) fails, the idea is a dashboard with a
budget attached (`brief` §13) → **fall back to F3**, which shares this generator's skeleton and can be
live in 12 hours.

### Judge's hardest question, and the honest answer

> *"Your entire recovery number is a 4% recovery rate on an unknown base. What stops this being a report
> generator that flatters itself?"*

**Honest answer:** "Two things, and one admission. The admission: I have no evidence for 4% in either
direction — `economics.md` says so explicitly — so the tool prints it as an assumption and shows what
happens at 1% and at 8%. The first real check is that the five causes are **distinguishable from the
observable shape**, and if they aren't, the model can't work and we find that out on day one rather than
in front of a judge. The second is the refusal: about half of what we triage, we expect to decline, and
that is the honest output of a diagnostic tool. If the number of refusals is zero, I would not trust the
model." *(Triage rate is `ASSUMED` at 35% and recovery at 4% per `economics.md` §3 #15; neither is
sourced. Do not print them as facts.)*

## AMENDMENTS

A1 No "label-free" claim. Replace every "label-free" / "the model never sees the cause label" statement in F1 with:
   "Real ledgers contain no cause label. We train a multi-cause classifier on SIMULATED causes (population A) and
   evaluate it on a SHIFTED population B it has never seen. We claim robustness to distribution shift in simulation,
   not real-world accuracy." This wording is mandatory in README, report, slides and demo script.
   AI-role row becomes: "Multi-cause classification of the decline shape with a calibrated refusal option."
A2 Label handling. Generator writes:
   data/train/labels.parquet (cause labels for population A TRAIN split only - the only labels the model may read)
   truth/ (ground truth for A-test and all of B - evaluation only)
   src/model must never import or read truth/. An automated test enforces this and must stay green.
A3 Circularity defence is part of the spec, not an afterthought. Population B differs from A in ALL of:
   pay-cycle mix (weekly/biweekly/monthly shares), cause prior mix, activity-level distribution, noise level,
   holiday/festival calendar timing, device/channel mix, and decline-shape parameters per cause.
   Report for every model run: macro-F1 on A-test, macro-F1 on B, the gap, refusal rate on A vs B, calibration error
   on B, a shuffled-label control (must be near chance), best single-feature F1 (shows no leaked tell), and the rule
   baseline on B. The HEADLINE accuracy number is B only; A-test is context.
   Required honest sentence for the pitch: "The causes are simulated. What we show is that attribution survives a
   population the model never saw and that it refuses when the shape is ambiguous. Whether real causes look like
   ours is exactly what real upay data would answer first."
   Hour-6 gate gains a check: cause fingerprints are separable but NOT by any single feature, on both A and B.
A4 Kill switch condition (1) is measured on population B, not on A-test. Condition (2) unchanged (model >= 25% better
   money per recovered wallet than the rule, computed on B). Fallback on failure remains F3.
A5 Refusal is judged on population B too: refusal rate on B should rise vs A when shapes are ambiguous. If refusal
   rate is 0% on either population, that is a failing test.
A6 Hardest-question answer gains a second question and answer:
   Q: "Your model just learned your simulator." A: use the required sentence in A3, then show the B-population table.
A7 Window: the first 24 hours must stand alone as a complete submission. TIER 0 (done by hour 24) = generator with
   populations A and B, rule baseline, trained model with SHAP-style reasons, refusal path, money report with the
   1% / 4% / 8% recovery sweep, console UI, deployed demo URL that works offline from seeded data, README with every
   section required by CONTEXT_v3 section 9, report draft, the consent/compliance block, and a MINIMAL fairness check
   (macro-F1 and refusal rate per worker type and per pay cycle). Any other mandatory deliverable named in
   CONTEXT_v3 section 9 also goes in Tier 0. TIER 1 (hours 24-48) = depth only: second market variant, adversarial
   cases, deeper fairness analysis, video/polish. Nothing in Tier 1 may be required for the demo to work.
   The fairness check moving into Tier 0 is a proposal by this lock step; record it in DECISIONS.md as D7.
A8 Product name is WhyQuiet; Cause Desk is the operator console screen.

