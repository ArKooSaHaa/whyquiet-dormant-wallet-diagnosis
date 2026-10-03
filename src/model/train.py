"""LightGBM cause classifier with calibrated refusal (decision D22). Reads data/train only."""

from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_sample_weight

from src.model.features import features

CAUSES = ["job_exit", "migration", "solved_problem", "fee_shock", "supply_failure"]  # contract order
TRAIN_DIR = Path(__file__).resolve().parents[2] / "data" / "train"
ACCURACY_FLOOR = 0.90  # ASSUMED: attributed wallets must be this accurate on the validation slice
TAUS = np.round(np.arange(0.50, 0.901, 0.05), 2)
DELTAS = np.round(np.arange(0.10, 0.401, 0.05), 2)


def decide(proba: np.ndarray, tau: float, delta: float) -> tuple[list[str | None], list[list[str]]]:
    causes: list[str | None] = []
    reasons: list[list[str]] = []
    for p in proba:
        i, j = np.argsort(p)[::-1][:2]
        why = []
        if p[i] < tau:
            why.append(f"Top cause {CAUSES[i]} {p[i]:.2f} is below the {tau:.2f} bar (tau)")
        if p[i] - p[j] < delta:
            why.append(f"{CAUSES[i]} vs {CAUSES[j]} margin {p[i] - p[j]:.2f} is below {delta:.2f} (delta)")
        causes.append(None if why else CAUSES[i])
        reasons.append(why)
    return causes, reasons


def predict(booster: lgb.Booster, X: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    proba = np.asarray(booster.predict(X))
    contrib = np.asarray(booster.predict(X, pred_contrib=True)).reshape(len(X), len(CAUSES), X.shape[1] + 1)
    return proba, contrib


def _tune(proba: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    top2 = np.sort(proba, axis=1)[:, -2:]
    top, margin = top2[:, 1], top2[:, 1] - top2[:, 0]
    correct = proba.argmax(axis=1) == y
    best, fallback = None, None  # (refusal rate, tau, delta), (-accuracy, tau, delta)
    for tau in TAUS:
        for delta in DELTAS:
            kept = (top >= tau) & (margin >= delta)
            acc = correct[kept].mean() if kept.any() else 0.0
            if acc >= ACCURACY_FLOOR and (best is None or 1 - kept.mean() < best[0]):
                best = (1 - kept.mean(), tau, delta)
            if fallback is None or -acc < fallback[0]:
                fallback = (-acc, tau, delta)
    _, tau, delta = best or fallback  # type: ignore[misc]
    return float(tau), float(delta)


def train(seed: int, data_dir: Path = TRAIN_DIR) -> tuple[lgb.Booster, float, float]:
    wallets = pd.read_parquet(data_dir / "wallets.parquet")
    labels = pd.read_parquet(data_dir / "labels.parquet").set_index("wallet_id")["cause"]
    X = features(wallets, pd.read_parquet(data_dir / "weekly.parquet"))
    y = labels.loc[X.index].map(CAUSES.index).to_numpy()
    fit, val = train_test_split(np.arange(len(y)), test_size=0.2, stratify=y, random_state=seed)
    params = {"objective": "multiclass", "num_class": len(CAUSES), "learning_rate": 0.05, "num_leaves": 15,
              "min_data_in_leaf": 20, "seed": seed, "deterministic": True, "verbose": -1}
    data = lgb.Dataset(X.iloc[fit], y[fit], weight=compute_sample_weight("balanced", y[fit]))
    booster = lgb.train(params, data, num_boost_round=100)  # validation log loss is lowest near 100 rounds
    return booster, *_tune(predict(booster, X.iloc[val])[0], y[val])
