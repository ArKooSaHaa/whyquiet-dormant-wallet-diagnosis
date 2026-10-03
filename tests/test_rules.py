from src.rules.baseline import rule_baseline
from src.rules.money import ASSUMPTIONS, money_table
from src.rules.remedies import REMEDIES

EXPECTED_CAUSES = ["job_exit", "migration", "solved_problem", "fee_shock", "supply_failure"]


def test_baseline_rule():
    # Rule baseline fires iff weeks_silent >= 3
    res_0 = rule_baseline(0)
    assert res_0 == {"fired": False, "action": "none"}

    res_2 = rule_baseline(2)
    assert res_2 == {"fired": False, "action": "none"}

    res_3 = rule_baseline(3)
    assert res_3 == {"fired": True, "action": "message_everyone"}

    res_5 = rule_baseline(5)
    assert res_5 == {"fired": True, "action": "message_everyone"}


def test_remedies_structure():
    assert set(REMEDIES.keys()) == set(EXPECTED_CAUSES)

    for remedy in REMEDIES.values():
        assert "remedy_code" in remedy
        assert "label" in remedy
        assert "unit_cost_bdt" in remedy
        assert "message_en" in remedy
        assert "message_bn" in remedy
        assert isinstance(remedy["unit_cost_bdt"], (int, float))
        assert remedy["unit_cost_bdt"] >= 0
        assert len(remedy["message_en"]) > 0
        assert len(remedy["message_bn"]) > 0

    # Solved problem should have 0 unit cost
    assert REMEDIES["solved_problem"]["unit_cost_bdt"] == 0.0


def test_money_table_structure_and_assumptions():
    assert len(ASSUMPTIONS) > 0
    for assumption in ASSUMPTIONS:
        assert assumption.startswith("ASSUMED:")

    n_triaged = 1000
    n_correct = 600
    n_wrong = 150
    n_refused = 250

    rows = money_table(n_triaged, n_correct, n_wrong, n_refused)
    assert len(rows) == 9  # 3 strategies * 3 recovery rates

    strategies = {r["strategy"] for r in rows}
    assert strategies == {"rule", "model", "oracle"}

    rates = {r["recovery_rate"] for r in rows}
    assert rates == {0.01, 0.04, 0.08}

    for row in rows:
        assert "wallets_actioned" in row
        assert "users_recovered" in row
        assert "cost_bdt" in row
        assert "value_bdt" in row
        assert row["wallets_actioned"] >= 0
        assert row["users_recovered"] >= 0
        assert row["cost_bdt"] >= 0


def test_money_table_oracle_gte_model():
    n_triaged = 1000
    n_correct = 600
    n_wrong = 150
    n_refused = 250

    rows = money_table(n_triaged, n_correct, n_wrong, n_refused)
    by_strategy_rate = {(r["strategy"], r["recovery_rate"]): r for r in rows}

    for rate in (0.01, 0.04, 0.08):
        oracle = by_strategy_rate[("oracle", rate)]
        model = by_strategy_rate[("model", rate)]
        assert oracle["users_recovered"] >= model["users_recovered"]
        assert oracle["wallets_actioned"] >= model["wallets_actioned"]


def test_money_table_refusals_cost_zero():
    # If all wallets are refused in model, actioned = 0, cost = 0, recovery = 0
    rows = money_table(n_triaged=1000, n_correct=0, n_wrong=0, n_refused=1000)
    model_rows = [r for r in rows if r["strategy"] == "model"]
    for r in model_rows:
        assert r["wallets_actioned"] == 0
        assert r["users_recovered"] == 0.0
        assert r["cost_bdt"] == 0.0
        assert r["value_bdt"] == 0.0
