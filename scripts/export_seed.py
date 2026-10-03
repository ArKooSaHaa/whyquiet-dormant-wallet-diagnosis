"""Export web/public/seed.json (docs/contracts/seed-bundle.md): generate -> train -> decide on B -> evaluate.

Metrics and money use all of population B; `wallets` is a stratified UI sample of it.
Run: uv run python scripts/export_seed.py --seed 42
"""

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from datagen.generate import main as generate
from scripts.evaluate import _split, report
from src.model.train import ACCURACY_FLOOR, CAUSES, decide, predict, train
from src.rules.baseline import rule_baseline
from src.rules.remedies import REMEDIES

HONESTY_LINE = (  # AMENDMENT A1, verbatim
    "Real ledgers contain no cause label. We train a multi-cause classifier on SIMULATED causes (population A) and "
    "evaluate it on a SHIFTED population B it has never seen. We claim robustness to distribution shift in simulation, "
    "not real-world accuracy."
)
SAMPLE = 400
REFUSED_SHARE = 0.25  # of the UI sample; plan asks for >= 20% refused so the refusal screen has examples
MODEL_ASSUMPTIONS = [
    ("ASSUMED: every wallet and cause is simulated (datagen, D21); only the population A cause mix is anchored to a "
     "survey (IFC, Cote d'Ivoire), every other generator parameter is a design choice."),
    (f"ASSUMED: the model only names a cause when it is at least {ACCURACY_FLOOR:.0%} accurate on a validation "
     "slice of A-train; otherwise it refuses (D28)."),
]


def _round(x: Any) -> Any:
    if isinstance(x, float):
        return round(x, 4)
    if isinstance(x, dict):
        return {k: _round(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_round(v) for v in x]
    return x


def _pick(keys: pd.Series, k: int, seed: int) -> list[int]:
    """k positions spread evenly over rows sorted by stratum, so every stratum keeps its share."""
    order = keys.sample(frac=1, random_state=seed).sort_values(kind="stable").index.to_numpy()
    if k >= len(order):
        return order.tolist()
    return order[np.linspace(0, len(order) - 1, k).round().astype(int)].tolist()


def export(seed: int, root: Path = ROOT, out: Path = ROOT / "web" / "public" / "seed.json") -> dict:
    generate(seed, root)
    booster, tau, delta = train(seed, root / "data" / "train")
    wallets, X, truth = _split(root, "b", root / "truth" / "b_labels.parquet")
    proba, contrib = predict(booster, X)
    causes, reasons = decide(proba, tau, delta)
    top = proba.argmax(axis=1)

    verdict = pd.Series(["refused" if c is None else "attributed" for c in causes])
    stratum = verdict + "/" + pd.Series([CAUSES[i] for i in top])
    n_refused = int((verdict == "refused").sum())
    k_refused = min(n_refused, round(SAMPLE * REFUSED_SHARE))
    picks = (_pick(stratum[verdict == "refused"], k_refused, seed)
             + _pick(stratum[verdict == "attributed"], SAMPLE - k_refused, seed))

    weekly = pd.read_parquet(root / "data" / "b" / "weekly.parquet").sort_values("week")
    series: dict[str, list[dict]] = {}
    for w, week, n, amt in zip(*(weekly[c].tolist() for c in ["wallet_id", "week", "txn_count", "amount_bdt"])):
        series.setdefault(w, []).append({"week": week, "txn_count": n, "amount_bdt": amt})
    sample = []
    for i in sorted(picks):
        row = wallets.iloc[i]
        push = contrib[i, top[i], :-1]  # toward the predicted (or, if refused, top posterior) cause; bias dropped
        best = np.argsort(-np.abs(push))[:8]
        sample.append({
            "wallet_id": row["wallet_id"],
            "worker_type": row["worker_type"],
            "pay_cycle": row["pay_cycle"],
            "weeks_silent": int(X.iloc[i]["weeks_silent"]),
            "series": series[row["wallet_id"]],
            "verdict": verdict[i],
            "cause": causes[i],
            "posterior": {c: float(p) for c, p in zip(CAUSES, proba[i])},
            "contributions": [{"feature": X.columns[j], "value": float(X.iloc[i, j]), "contribution": float(push[j])}
                              for j in best],
            "refusal_reasons": reasons[i],
            "rule_baseline": rule_baseline(int(X.iloc[i]["weeks_silent"])),
        })

    rep = report(seed, root)
    n_correct = sum(c == t for c, t in zip(causes, truth))
    try:
        from src.rules.money import ASSUMPTIONS, money_table
        money = money_table(len(truth), n_correct, len(truth) - n_refused - n_correct, n_refused)
    except ImportError:  # plan: carry on with money = null if the rules module is not ready
        money, ASSUMPTIONS = None, []

    bundle = _round({
        "meta": {
            "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "seed": seed,
            "model_version": "lgbm-v1",
            "tau": tau,
            "delta": delta,
            "n_wallets_b_total": len(truth),
            "honesty_line": HONESTY_LINE,
        },
        "wallets": sample,
        "report": {**rep, "money": money, "assumptions": ASSUMPTIONS + MODEL_ASSUMPTIONS},
        "remedies": REMEDIES,
    })
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return bundle


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=42)
    b = export(parser.parse_args().seed)
    refused = sum(w["verdict"] == "refused" for w in b["wallets"])
    print(f"wrote seed.json: {len(b['wallets'])} wallets ({refused} refused), B macro-F1 {b['report']['ml']['macro_f1_b']}")
