import json
from pathlib import Path


def test_seed_sample_bundle():
    seed_path = Path("web/public/seed.sample.json")
    assert seed_path.exists(), "web/public/seed.sample.json must exist"

    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Meta verification
    meta = data["meta"]
    assert meta["model_version"] == "sample"
    assert meta["tau"] > 0
    assert meta["delta"] > 0
    assert meta["n_wallets_b_total"] > 0
    assert len(meta["honesty_line"]) > 0

    # 2. Remedies verification (all 5 causes)
    expected_causes = {"job_exit", "migration", "solved_problem", "fee_shock", "supply_failure"}
    remedies = data["remedies"]
    assert set(remedies.keys()) == expected_causes
    for remedy in remedies.values():
        assert remedy["remedy_code"]
        assert remedy["label"]
        assert isinstance(remedy["unit_cost_bdt"], (int, float))
        assert remedy["message_en"]
        assert remedy["message_bn"]

    # 3. Report verification
    report = data["report"]
    ml = report["ml"]
    assert ml["macro_f1_b"] > 0
    assert ml["rule_baseline_f1_b"] > 0
    assert ml["shuffled_label_f1_b"] > 0
    assert ml["best_single_feature"]
    assert ml["refusal_rate_b"] > 0

    assert report["confusion_b"]["labels"] == list(expected_causes) or set(report["confusion_b"]["labels"]) == expected_causes
    assert len(report["confusion_b"]["matrix"]) == 5
    for row in report["confusion_b"]["matrix"]:
        assert len(row) == 5

    assert len(report["fairness"]) >= 7
    slices = {item["slice"] for item in report["fairness"]}
    assert "worker_type" in slices
    assert "pay_cycle" in slices

    # Money rows: 9 rows
    money = report["money"]
    assert money is not None
    assert len(money) == 9
    rates = {row["recovery_rate"] for row in money}
    strategies = {row["strategy"] for row in money}
    assert rates == {0.01, 0.04, 0.08}
    assert strategies == {"rule", "model", "oracle"}

    # 4. Wallets verification: exactly 20
    wallets = data["wallets"]
    assert len(wallets) == 20

    attributed = [w for w in wallets if w["verdict"] == "attributed"]
    refused = [w for w in wallets if w["verdict"] == "refused"]

    assert len(refused) >= 5, f"Expected >= 5 refused wallets, got {len(refused)}"
    assert len(attributed) >= 5

    # Check all 5 causes are covered in attributed
    attributed_causes = {w["cause"] for w in attributed}
    assert attributed_causes == expected_causes, f"Missing causes: {expected_causes - attributed_causes}"

    # Check worker types and pay cycles are mixed
    worker_types = {w["worker_type"] for w in wallets}
    pay_cycles = {w["pay_cycle"] for w in wallets}
    assert len(worker_types) >= 4
    assert pay_cycles == {"weekly", "biweekly", "monthly"}

    has_uniform_posterior_refusal = False
    has_tie_refusal = False

    for w in wallets:
        assert w["wallet_id"].startswith("W-")
        assert len(w["wallet_id"]) == 8  # W- + 6 chars
        assert len(w["series"]) == 26
        for pt in w["series"]:
            assert 1 <= pt["week"] <= 26
            assert pt["txn_count"] >= 0
            assert pt["amount_bdt"] >= 0

        # Posteriors sum to ~1.0
        posterior = w["posterior"]
        assert set(posterior.keys()) == expected_causes
        prob_sum = sum(posterior.values())
        assert abs(prob_sum - 1.0) < 0.02, f"Posterior does not sum to 1: {prob_sum}"

        # Top 8 contributions
        assert len(w["contributions"]) <= 8
        for c in w["contributions"]:
            assert c["feature"]
            assert isinstance(c["value"], (int, float))
            assert isinstance(c["contribution"], (int, float))

        # Check verdict consistency
        if w["verdict"] == "attributed":
            assert w["cause"] in expected_causes
            assert len(w["refusal_reasons"]) == 0
        else:
            assert w["cause"] is None
            assert len(w["refusal_reasons"]) > 0

        # Rule baseline consistency
        if w["weeks_silent"] >= 3:
            assert w["rule_baseline"] == {"fired": True, "action": "message_everyone"}
        else:
            assert w["rule_baseline"] == {"fired": False, "action": "none"}

        # Check special refusal cases
        if w["verdict"] == "refused":
            probs = sorted(posterior.values(), reverse=True)
            if probs[0] - probs[-1] < 0.05:
                has_uniform_posterior_refusal = True
            if probs[0] - probs[1] <= meta["delta"]:
                has_tie_refusal = True

    assert has_uniform_posterior_refusal, "Must include a refused wallet with near-uniform posterior"
    assert has_tie_refusal, "Must include a refused wallet with a 2-cause tie / small margin"
