"""Shape features: one row per dormant wallet from its weekly series (decision D27).

D = first silent week. "Base" = active history before D-8 (all history if under 4 weeks). Ratios are taken
against the wallet's own base so they survive population B's lower activity. Missing values become -1.
"""

import numpy as np
import pandas as pd

CYCLE = {"weekly": 0, "biweekly": 1, "monthly": 2}
WEEKS = 52  # observed at the end of week 51


def _ratio(a: float, b: float) -> float:
    return float(a / max(b, 1e-6))


def _wallet(g: pd.DataFrame, acquired: int, fee_week: int, cycle: str) -> dict[str, float]:
    week = g["week"].to_numpy()
    txn = g["txn_count"].to_numpy(float)
    amt = g["amount_bdt"].to_numpy(float)
    cashin = g["cashin_count"].to_numpy(float)
    ok = g["cashout_ok"].to_numpy(float)
    fail = g["cashout_fail"].to_numpy(float)
    app = g["app_share"]  # NaN in weeks with no transactions; Series.mean skips it
    moved = g["district_changed"].to_numpy() > 0

    d = int(week[txn > 0].max()) + 1
    hist = week < d
    base = hist & (week < d - 8)
    if base.sum() < 4:
        base = hist
    last4 = hist & (week >= d - 4)
    last6 = hist & (week >= d - 6)
    last8 = hist & (week >= d - 8)
    base_txn = txn[base].mean()

    slope = np.polyfit(week[last8], txn[last8], 1)[0] if last8.sum() >= 2 else 0.0
    cashin_weeks = week[hist & (cashin > 0)]
    move_weeks = week[hist & moved]
    active = hist & (txn > 0)
    burst_week = int(week[active][amt[active].argmax()])
    after = (week >= fee_week) & (week < fee_week + 4)
    before = (week >= fee_week - 4) & (week < fee_week)
    fade = 0
    while d - 1 - fade >= acquired and txn[week == d - 1 - fade].sum() < 0.5 * base_txn:
        fade += 1

    return {
        "weeks_silent": WEEKS - d,
        "active_weeks": d - acquired,
        "base_txn_mean": float(np.log1p(base_txn)),
        "last4_txn_ratio": _ratio(txn[last4].mean(), base_txn),
        "slope_last8": _ratio(slope, base_txn),
        "ticket_ratio": _ratio(_ratio(amt[last4].sum(), txn[last4].sum()), _ratio(amt[base].sum(), txn[base].sum()))
        if txn[last4].sum() > 0 and txn[base].sum() > 0 else -1.0,
        "weeks_since_cashin": d - int(cashin_weeks.max()) if len(cashin_weeks) else -1,
        "cashin_ratio_last4": _ratio(cashin[last4].mean(), cashin[base].mean()),
        "pay_cycle": CYCLE[cycle],
        "district_changed": float(len(move_weeks) > 0),
        "weeks_since_district_change": d - int(move_weeks.max()) if len(move_weeks) else -1,
        "app_share_shift": float(np.nan_to_num(app[last4].mean() - app[base].mean())),
        "burst_ratio": _ratio(amt[active].max(), float(np.median(amt[active]))),
        "weeks_since_burst": d - burst_week,
        "weeks_after_fee": d - fee_week,
        "post_fee_ratio": _ratio(txn[after].mean(), txn[before].mean())
        if fee_week < d and before.any() and after.any() else -1.0,
        "fail_last6": float(fail[last6].sum()),
        "fail_rate_last6": _ratio(fail[last6].sum(), ok[last6].sum() + fail[last6].sum()),
        "cashout_ok_ratio_last4": _ratio(ok[last4].mean(), ok[base].mean()),
        "fade_weeks": fade,
    }


def features(wallets: pd.DataFrame, weekly: pd.DataFrame) -> pd.DataFrame:
    groups = dict(tuple(weekly.sort_values("week").groupby("wallet_id", sort=False)))
    cols = zip(wallets["wallet_id"], wallets["acquired_week"], wallets["fee_week"], wallets["pay_cycle"])
    rows = [_wallet(groups[w], int(acq), int(fee), str(cycle)) for w, acq, fee, cycle in cols]
    return pd.DataFrame(rows, index=pd.Index(wallets["wallet_id"], name="wallet_id"), dtype=float)
