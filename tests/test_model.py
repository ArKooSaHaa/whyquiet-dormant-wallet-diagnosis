"""src/model: features, LightGBM classifier and calibrated refusal (decision D22)."""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from datagen.generate import main as generate
from src.model.features import features
from src.model.train import CAUSES, _tune, decide, predict, train


def test_causes_follow_contract_order():
    assert CAUSES == ["job_exit", "migration", "solved_problem", "fee_shock", "supply_failure"]


def test_decide_refuses_uniform_posterior_with_both_reasons():
    causes, reasons = decide(np.full((1, 5), 0.2), tau=0.5, delta=0.1)
    assert causes == [None]
    assert len(reasons[0]) == 2
    assert "0.20" in reasons[0][0] and "0.50" in reasons[0][0]


def test_decide_attributes_peaked_posterior():
    causes, reasons = decide(np.array([[0.9, 0.04, 0.02, 0.02, 0.02]]), tau=0.5, delta=0.1)
    assert causes == ["job_exit"]
    assert reasons == [[]]


def test_decide_refuses_near_tie_naming_both_causes():
    causes, reasons = decide(np.array([[0.05, 0.45, 0.02, 0.43, 0.05]]), tau=0.4, delta=0.1)
    assert causes == [None]
    assert len(reasons[0]) == 1
    assert "migration" in reasons[0][0] and "fee_shock" in reasons[0][0] and "0.02" in reasons[0][0]


def test_tune_raises_bar_to_drop_unsure_mistakes():
    sure = np.tile([0.96, 0.01, 0.01, 0.01, 0.01], (85, 1))  # right
    unsure = np.tile([0.60, 0.28, 0.04, 0.04, 0.04], (15, 1))  # wrong (truth is migration), margin 0.32
    y = np.array([0] * 85 + [1] * 15)
    # 85% < 0.90 floor at the lowest bar; delta 0.35 drops all 15 mistakes; tie on refusal -> smaller tau wins
    assert _tune(np.vstack([sure, unsure]), y) == (0.50, 0.35)


@pytest.fixture(scope="module")
def data(tmp_path_factory: pytest.TempPathFactory) -> Path:
    out = tmp_path_factory.mktemp("model")
    generate(0, out)
    return out / "data" / "train"


@pytest.fixture(scope="module")
def trained(data: Path):
    return train(0, data)


def test_features_one_clean_row_per_wallet(data: Path):
    wallets = pd.read_parquet(data / "wallets.parquet")
    X = features(wallets, pd.read_parquet(data / "weekly.parquet"))
    assert list(X.index) == list(wallets["wallet_id"])
    assert 15 <= X.shape[1] <= 25
    assert not X.isna().any().any()
    assert "worker_type" not in X.columns


def test_features_weeks_silent_matches_last_active_week():
    wallets = pd.DataFrame({"wallet_id": ["W-1"], "worker_type": ["garment"], "pay_cycle": ["weekly"],
                            "acquired_week": [40], "fee_week": [38]})
    txn = [3, 4, 5, 2, 6, 0, 0, 0, 0, 0, 0, 0]  # weeks 40..51, last active week 44
    weekly = pd.DataFrame({"wallet_id": "W-1", "week": range(40, 52), "txn_count": txn,
                           "amount_bdt": [t * 500 for t in txn], "cashin_count": 1, "cashout_ok": 1,
                           "cashout_fail": 0, "app_share": 0.5, "district_changed": 0})
    X = features(wallets, weekly)
    assert X.loc["W-1", "weeks_silent"] == 7
    assert X.loc["W-1", "active_weeks"] == 5


def test_predict_shapes_and_probabilities(data: Path, trained):
    booster, _, _ = trained
    X = features(pd.read_parquet(data / "wallets.parquet"), pd.read_parquet(data / "weekly.parquet"))
    proba, contrib = predict(booster, X)
    assert proba.shape == (len(X), 5)
    assert np.allclose(proba.sum(axis=1), 1)
    assert contrib.shape == (len(X), 5, X.shape[1] + 1)
    raw = booster.predict(X, raw_score=True)
    assert np.allclose(contrib.sum(axis=2), raw)


def test_tuned_thresholds_in_grid_and_some_refusal(data: Path, trained):
    booster, tau, delta = trained
    assert 0.50 <= tau <= 0.90 and 0.10 <= delta <= 0.40
    X = features(pd.read_parquet(data / "wallets.parquet"), pd.read_parquet(data / "weekly.parquet"))
    causes, _ = decide(predict(booster, X)[0], tau, delta)
    assert any(c is None for c in causes)
