"""Economic recovery and value calculation table across recovery rate sweeps.

All financial and rate constants are ASSUMED and documented in ASSUMPTIONS.
"""

# ASSUMED: average monthly revenue per active wallet in BDT
ARPU_BDT: float = 120.0

# ASSUMED: 3-month average active lifetime value multiplier upon reactivation
RAMP: float = 3.0

# ASSUMED: generic broadcast message is 25% as effective as cause-targeted remedy
GENERIC_FACTOR: float = 0.25

# ASSUMED: generic SMS broadcast cost 0.50 BDT per wallet
MSG_COST_BDT: float = 0.50

# ASSUMED: average unit cost across cause-targeted remedies in BDT
AVG_REMEDY_COST_BDT: float = 11.0

# Recovery rates evaluated in the sensitivity sweep
RECOVERY_RATES: tuple[float, float, float] = (0.01, 0.04, 0.08)

ASSUMPTIONS: list[str] = [
    f"ASSUMED: ARPU is {ARPU_BDT:.1f} BDT/month per active user wallet.",
    f"ASSUMED: Reactivated users produce a {RAMP:.1f}-month active lifetime value multiplier (RAMP).",
    f"ASSUMED: Generic broadcast is {GENERIC_FACTOR * 100:.0f}% as effective as cause-targeted remedies.",
    f"ASSUMED: Generic SMS broadcast unit cost is {MSG_COST_BDT:.2f} BDT per wallet.",
    f"ASSUMED: Cause-targeted remedies average {AVG_REMEDY_COST_BDT:.1f} BDT unit cost across causes.",
    "ASSUMED: Sensitivity analysis sweeps recovery rates at 1%, 4%, and 8%.",
]


def money_table(n_triaged: int, n_correct: int, n_wrong: int, n_refused: int) -> list[dict]:
    """Calculate the 9-row economic matrix (3 strategies x 3 recovery rates).

    Strategies:
      - rule: broadcast generic message to everyone triaged (recovers at rate * GENERIC_FACTOR).
      - model: targeted remedy to non-refused wallets (correct recovers at rate, wrong at rate * GENERIC_FACTOR, refused cost 0).
      - oracle: perfect cause identification for all triaged wallets (recovers at full rate).
    """
    rows: list[dict] = []

    for rate in RECOVERY_RATES:
        # 1. Rule Strategy
        rule_actioned = n_triaged
        rule_recovered = n_triaged * (rate * GENERIC_FACTOR)
        rule_cost = n_triaged * MSG_COST_BDT
        rule_value = rule_recovered * ARPU_BDT * RAMP - rule_cost

        rows.append(
            {
                "recovery_rate": rate,
                "strategy": "rule",
                "wallets_actioned": rule_actioned,
                "users_recovered": round(rule_recovered, 4),
                "cost_bdt": round(rule_cost, 2),
                "value_bdt": round(rule_value, 2),
            }
        )

        # 2. Model Strategy
        model_actioned = max(0, n_triaged - n_refused)
        model_recovered = (n_correct * rate) + (n_wrong * rate * GENERIC_FACTOR)
        model_cost = model_actioned * AVG_REMEDY_COST_BDT
        model_value = model_recovered * ARPU_BDT * RAMP - model_cost

        rows.append(
            {
                "recovery_rate": rate,
                "strategy": "model",
                "wallets_actioned": model_actioned,
                "users_recovered": round(model_recovered, 4),
                "cost_bdt": round(model_cost, 2),
                "value_bdt": round(model_value, 2),
            }
        )

        # 3. Oracle Strategy
        oracle_actioned = n_triaged
        oracle_recovered = n_triaged * rate
        oracle_cost = n_triaged * AVG_REMEDY_COST_BDT
        oracle_value = oracle_recovered * ARPU_BDT * RAMP - oracle_cost

        rows.append(
            {
                "recovery_rate": rate,
                "strategy": "oracle",
                "wallets_actioned": oracle_actioned,
                "users_recovered": round(oracle_recovered, 4),
                "cost_bdt": round(oracle_cost, 2),
                "value_bdt": round(oracle_value, 2),
            }
        )

    return rows
