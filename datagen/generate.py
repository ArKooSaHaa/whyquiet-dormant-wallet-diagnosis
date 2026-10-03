"""Synthetic dormant-wallet generator: population A (train/test) and shifted population B (eval only).

Design: decision D21 in docs/DECISIONS.md. Every number in this file is ASSUMED unless noted.
Run: uv run python -m datagen.generate --seed 42
"""

import argparse
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

CAUSES = ["job_exit", "solved_problem", "fee_shock", "supply_failure", "migration"]
WORKERS = ["garment", "domestic", "transport", "retail"]
CYCLES = ["weekly", "biweekly", "monthly"]
ROOT = Path(__file__).resolve().parent.parent  # repo root: data/ and truth/ live here
WEEKS = 52  # weeks 0..51, observed at the end of week 51
LAST_START = WEEKS - 3  # dormancy starts by week 49, so every wallet has >= 3 silent weeks
TICKET_BDT = {"garment": 900, "domestic": 500, "transport": 700, "retail": 1200}  # median BDT per txn

PARAMS = {
    "A": {
        "pay_cycle": [0.40, 0.20, 0.40],  # weekly, biweekly, monthly
        # job_exit, solved_problem, fee_shock, supply_failure, migration. First three rounded from the IFC
        # Cote d'Ivoire inactivity survey (spec "Parameters"); supply_failure and migration ASSUMED.
        "cause": [0.35, 0.22, 0.13, 0.15, 0.15],
        "worker": [0.40, 0.20, 0.20, 0.20],  # garment, domestic, transport, retail
        "activity": 5.0,  # median txns per week
        "noise": 0.3,  # lognormal sigma, per week
        "holidays": [14, 24],
        "app_share": 0.60,
        "fee_week": 38,
        "job_lag": (0, 1),  # inclusive week ranges
        "mig_lead": (2, 6),
        "fee_lag": (0, 3),
        "fail_ramp": (2, 4),
        "blended": 0.20,
    },
    "B": {
        "pay_cycle": [0.20, 0.20, 0.60],
        "cause": [0.25, 0.15, 0.25, 0.20, 0.15],
        "worker": [0.25, 0.25, 0.30, 0.20],
        "activity": 3.0,
        "noise": 0.5,
        "holidays": [12, 22],  # Eid moves ~11 days earlier each lunar year
        "app_share": 0.35,
        "fee_week": 34,
        "job_lag": (0, 2),
        "mig_lead": (1, 4),
        "fee_lag": (1, 5),
        "fail_ramp": (1, 3),
        "blended": 0.30,
    },
}


def _between(rng: np.random.Generator, lo_hi: tuple[int, int]) -> int:
    return int(rng.integers(lo_hi[0], lo_hi[1] + 1))


def _paydays(cycle: str, rng: np.random.Generator) -> np.ndarray:
    if cycle == "weekly":
        return np.arange(WEEKS)
    if cycle == "biweekly":
        return np.arange(int(rng.integers(0, 2)), WEEKS, 2)
    offset = int(rng.integers(0, 4))
    return np.unique(np.round(offset + 4.345 * np.arange(13)).astype(int).clip(0, WEEKS - 1))


def _ramp(n_weeks: int, start: int, stop: int, a: float, b: float) -> np.ndarray:
    """Array of ones with a linear a->b ramp over weeks [start, stop)."""
    out = np.ones(n_weeks)
    start = max(start, 0)
    if stop > start:
        out[start:stop] = np.linspace(a, b, stop - start)
    return out


def _effect(
    cause: str, start: int, acquired: int, fee_decline: int, p: dict, rng: np.random.Generator
) -> dict[str, Any]:
    """What one cause does to the weeks before dormancy `start`. `fee_decline` is when fee_shock starts to bite."""
    e: dict[str, Any] = {
        "count": np.ones(WEEKS),  # multiplier on txn rate
        "ticket": np.ones(WEEKS),  # multiplier on BDT per txn
        "fail": np.zeros(WEEKS),  # expected failed cash-outs
        "ok": np.ones(WEEKS),  # multiplier on successful cash-outs
        "cashin_stop": WEEKS,  # no cash-ins from this week on
        "district": None,  # week the wallet changes district
        "app_shift": 0.0,  # change in app_share after the district change
    }
    if cause == "job_exit":
        e["cashin_stop"] = start - int(rng.integers(2, 5))  # the last salary never arrives
    elif cause == "migration":
        moved = max(start - _between(rng, p["mig_lead"]), acquired)
        e["district"] = moved
        e["app_shift"] = 0.25
        e["count"] = _ramp(WEEKS, moved, start, 1.0, 0.3)
    elif cause == "solved_problem":
        burst = start - 1 - int(rng.integers(0, 3))
        e["count"] = np.full(WEEKS, 0.4)
        e["count"][burst] = 5.0
        e["count"][burst + 1 : start] = 0.1
        e["ticket"][burst] = 3.0
    elif cause == "fee_shock":
        e["count"] = _ramp(WEEKS, fee_decline + 1, start, 1.0, 0.3)  # count falls one week after amount
        e["ticket"] = _ramp(WEEKS, fee_decline, start, 0.8, 0.4)
    elif cause == "supply_failure":
        ramp_from = start - _between(rng, p["fail_ramp"])
        e["fail"][max(ramp_from, 0) : start] = np.linspace(1.0, 4.0, start - max(ramp_from, 0))
        e["ok"] = _ramp(WEEKS, ramp_from, start, 0.8, 0.2)
        e["count"] = _ramp(WEEKS, ramp_from, start, 0.9, 0.4)
    return e


def _blend(e1: dict[str, Any], e2: dict[str, Any], w: float) -> dict[str, Any]:
    out = {k: w * e1[k] + (1 - w) * e2[k] for k in ("count", "ticket", "fail", "ok", "app_shift")}
    out["cashin_stop"] = min(e1["cashin_stop"], e2["cashin_stop"])
    out["district"] = e1["district"] if e1["district"] is not None else e2["district"]
    return out


def _wallet(wid: str, cause: str, p: dict, rng: np.random.Generator) -> tuple[dict[str, Any], pd.DataFrame, bool]:
    cycle = str(rng.choice(CYCLES, p=p["pay_cycle"]))
    worker = str(rng.choice(WORKERS, p=p["worker"]))
    paydays = _paydays(cycle, rng)

    # Dormancy start: fee_shock follows the fee week; job_exit snaps to just after a payday.
    fee_decline = p["fee_week"] + _between(rng, p["fee_lag"])
    if cause == "fee_shock":
        start = fee_decline + int(rng.integers(2, 5))
    else:
        start = WEEKS - int(rng.integers(3, 16))
    if cause == "job_exit":
        before = paydays[paydays < start]
        if len(before):
            start = int(before.max()) + 1 + _between(rng, p["job_lag"])
    start = min(start, LAST_START)

    acquired = int(rng.integers(10, 41)) if cause == "solved_problem" else int(rng.integers(0, 41))
    acquired = min(acquired, start - 4)

    effect = _effect(cause, start, acquired, fee_decline, p, rng)
    blended = bool(rng.random() < p["blended"])
    if blended:
        other = str(rng.choice([c for c in CAUSES if c != cause]))
        other_effect = _effect(other, start, acquired, fee_decline, p, rng)
        effect = _blend(effect, other_effect, float(rng.uniform(0.5, 0.8)))

    # Overlap: clues that also show up in wallets of other causes.
    if cause != "supply_failure" and rng.random() < 0.05:
        effect["fail"] = effect["fail"].copy()
        effect["fail"][rng.integers(acquired, start, size=2)] += 1.5
    if cause != "migration" and effect["district"] is None and rng.random() < 0.03:
        effect["district"] = int(rng.integers(acquired, start))

    weeks = np.arange(WEEKS)
    payday = np.isin(weeks, paydays)
    rate = p["activity"] * rng.lognormal(0, 0.5)  # per-wallet activity level
    rate = rate * np.where(payday, 1.6, 0.8) * np.where(np.isin(weeks, p["holidays"]), 0.4, 1.0)
    rate = rate * rng.lognormal(0, p["noise"], WEEKS) * effect["count"]
    rate[(weeks < acquired) | (weeks >= start)] = 0.0

    txn = rng.poisson(rate)
    txn[start - 1] = max(txn[start - 1], 1)  # last active week, so weeks_silent == WEEKS - start
    p_in = np.where(payday, 0.5, 0.15) * (weeks < effect["cashin_stop"])
    cashin = rng.binomial(txn, p_in)
    cashout_ok = rng.binomial(txn - cashin, np.clip(0.4 * effect["ok"], 0, 1))
    cashout_fail = rng.poisson(effect["fail"]) * (weeks >= acquired) * (weeks < start)
    ticket = TICKET_BDT[worker] * rng.lognormal(0, 0.3, WEEKS) * effect["ticket"]
    ticket = ticket * np.where(weeks >= p["fee_week"], rng.uniform(0.85, 1.0), 1.0)  # everyone feels the fee
    amount = np.round(txn * ticket).astype(int)

    base_app = rng.beta(p["app_share"] * 8, (1 - p["app_share"]) * 8)
    shift = np.zeros(WEEKS)
    district = np.zeros(WEEKS, dtype=int)
    if effect["district"] is not None:
        shift[effect["district"] :] = effect["app_shift"]
        district[effect["district"]] = 1
    app = np.clip(base_app + shift + rng.normal(0, 0.05, WEEKS), 0, 1)

    keep = weeks >= acquired
    weekly = pd.DataFrame(
        {
            "wallet_id": wid,
            "week": weeks[keep],
            "txn_count": txn[keep],
            "amount_bdt": amount[keep],
            "cashin_count": cashin[keep],
            "cashout_ok": cashout_ok[keep],
            "cashout_fail": cashout_fail[keep],
            "app_share": np.where(txn[keep] > 0, app[keep], np.nan),
            "district_changed": district[keep],
        }
    )
    info = {"wallet_id": wid, "worker_type": worker, "pay_cycle": cycle, "acquired_week": acquired,
            "fee_week": p["fee_week"]}
    return info, weekly, blended


def make_population(
    p: dict, ids: list[str], rng: np.random.Generator
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Wallets, weekly rows and labels (wallet_id, cause, blended) for one population."""
    causes = rng.choice(CAUSES, size=len(ids), p=p["cause"])
    infos, weeklies, labels = [], [], []
    for wid, cause in zip(ids, causes):
        info, weekly, blended = _wallet(wid, str(cause), p, rng)
        infos.append(info)
        weeklies.append(weekly)
        labels.append({"wallet_id": wid, "cause": str(cause), "blended": blended})
    return pd.DataFrame(infos), pd.concat(weeklies, ignore_index=True), pd.DataFrame(labels)


def wallet_ids(n: int, rng: np.random.Generator) -> list[str]:
    """n unique ids "W-" + 6 chars [0-9A-Z]."""
    alphabet = np.array(list("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"))
    nums = rng.choice(36**6, size=n, replace=False)
    digits = (nums[:, None] // 36 ** np.arange(5, -1, -1)) % 36
    return ["W-" + "".join(row) for row in alphabet[digits]]


def main(seed: int, out: Path = ROOT) -> None:
    rng = np.random.default_rng(seed)
    ids = wallet_ids(9000, rng)
    a_wallets, a_weekly, a_labels = make_population(PARAMS["A"], ids[:6000], rng)
    b_wallets, b_weekly, b_labels = make_population(PARAMS["B"], ids[6000:], rng)

    train_ids = list(rng.permutation(a_labels["wallet_id"].to_numpy())[:4800])

    def split(df: pd.DataFrame, train: bool) -> pd.DataFrame:
        return df.loc[df["wallet_id"].isin(train_ids) == train]

    def save(df: pd.DataFrame, path: str) -> None:
        (out / path).parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(out / path, index=False)

    save(split(a_wallets, True), "data/train/wallets.parquet")
    save(split(a_weekly, True), "data/train/weekly.parquet")
    save(split(a_labels, True), "data/train/labels.parquet")
    save(split(a_wallets, False), "data/a_test/wallets.parquet")
    save(split(a_weekly, False), "data/a_test/weekly.parquet")
    save(b_wallets, "data/b/wallets.parquet")
    save(b_weekly, "data/b/weekly.parquet")
    save(split(a_labels, False), "truth/a_test_labels.parquet")
    save(b_labels, "truth/b_labels.parquet")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", type=Path, default=ROOT)
    args = parser.parse_args()
    main(args.seed, args.out)
