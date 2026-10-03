"""scripts/evaluate.py: report.ml, report.confusion_b and report.fairness (docs/contracts/seed-bundle.md)."""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from datagen.generate import main as generate
from scripts.evaluate import confusion, ece, fairness, macro_f1, report
from src.model.train import CAUSES

ML_KEYS = {"macro_f1_a_test", "macro_f1_b", "gap", "refusal_rate_a", "refusal_rate_b", "ece_b",
           "shuffled_label_f1_b", "best_single_feature", "best_single_feature_f1_b", "rule_baseline_f1_b"}


def test_macro_f1_ignores_refused_wallets():
    truth = ["job_exit", "job_exit", "migration", "migration"]
    pred = ["job_exit", None, "migration", "job_exit"]
    assert macro_f1(truth, pred) == pytest.approx(2 / 3)


def test_ece_zero_when_confidence_matches_accuracy():
    proba = np.tile([0.8, 0.05, 0.05, 0.05, 0.05], (10, 1))
    truth = ["job_exit"] * 8 + ["migration"] * 2
    assert ece(proba, truth) == pytest.approx(0.0)


def test_ece_equals_confidence_when_always_wrong():
    proba = np.tile([0.9, 0.025, 0.025, 0.025, 0.025], (4, 1))
    assert ece(proba, ["migration"] * 4) == pytest.approx(0.9)


def test_confusion_counts_attributed_only_rows_true():
    out = confusion(["job_exit", "migration", "migration"], ["job_exit", "job_exit", None])
    assert out["labels"] == CAUSES
    assert out["matrix"][0][0] == 1 and out["matrix"][1][0] == 1
    assert sum(map(sum, out["matrix"])) == 2


def test_fairness_rows_per_slice_and_group():
    wallets = pd.DataFrame({"worker_type": ["garment", "garment", "retail"],
                            "pay_cycle": ["weekly", "monthly", "monthly"]})
    rows = fairness(wallets, ["job_exit", "migration", "job_exit"], ["job_exit", None, "job_exit"])
    garment = next(r for r in rows if r["slice"] == "worker_type" and r["group"] == "garment")
    assert garment == {"slice": "worker_type", "group": "garment", "n": 2, "macro_f1": 1.0, "refusal_rate": 0.5}
    assert {(r["slice"], r["group"]) for r in rows} == {
        ("worker_type", "garment"), ("worker_type", "retail"), ("pay_cycle", "weekly"), ("pay_cycle", "monthly")}


@pytest.fixture(scope="module")
def rep(tmp_path_factory: pytest.TempPathFactory) -> dict:
    root: Path = tmp_path_factory.mktemp("eval")
    generate(0, root)
    return report(0, root)


def test_report_matches_contract_shape(rep: dict):
    assert set(rep) == {"ml", "confusion_b", "fairness"}
    assert set(rep["ml"]) == ML_KEYS
    assert rep["ml"]["gap"] == pytest.approx(rep["ml"]["macro_f1_a_test"] - rep["ml"]["macro_f1_b"])
    assert isinstance(rep["ml"]["best_single_feature"], str) and rep["ml"]["best_single_feature"]
    assert len(rep["fairness"]) == 4 + 3  # 4 worker types + 3 pay cycles
    assert all(isinstance(v, int) for row in rep["confusion_b"]["matrix"] for v in row)


def test_report_controls_sit_below_the_model(rep: dict):
    ml = rep["ml"]
    assert ml["shuffled_label_f1_b"] < 0.35
    assert ml["rule_baseline_f1_b"] < ml["macro_f1_b"]
    assert ml["best_single_feature_f1_b"] < ml["macro_f1_b"]
    assert 0 < ml["refusal_rate_a"] and 0 < ml["refusal_rate_b"]
    assert 0 <= ml["ece_b"] <= 1
