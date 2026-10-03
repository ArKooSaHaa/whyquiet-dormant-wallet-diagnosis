"""Generator checks: shapes, cause fingerprints, A vs B shift, determinism (design: D21 in docs/DECISIONS.md)."""

import re

import numpy as np
import pandas as pd
import pytest

from datagen import generate
from datagen.generate import CAUSES, PARAMS, make_population, wallet_ids

Population = tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]  # wallets, weekly, labels


@pytest.fixture(scope="module")
def pops() -> dict[str, Population]:
    rng = np.random.default_rng(42)
    ids = wallet_ids(9000, rng)
    return {
        "A": make_population(PARAMS["A"], ids[:6000], rng),
        "B": make_population(PARAMS["B"], ids[6000:], rng),
    }


def test_ids_unique_and_well_formed():
    ids = pd.Series(wallet_ids(9000, np.random.default_rng(0)))
    assert ids.is_unique
    assert ids.map(lambda s: bool(re.fullmatch(r"W-[0-9A-Z]{6}", s))).all()


def test_shapes_and_columns(pops: dict[str, Population]):
    wallets, weekly, labels = pops["A"]
    assert len(wallets) == len(labels) == 6000
    assert list(wallets.columns) == ["wallet_id", "worker_type", "pay_cycle", "acquired_week", "fee_week"]
    assert list(weekly.columns) == [
        "wallet_id", "week", "txn_count", "amount_bdt", "cashin_count",
        "cashout_ok", "cashout_fail", "app_share", "district_changed",
    ]
    assert list(labels.columns) == ["wallet_id", "cause", "blended"]
    assert set(weekly["wallet_id"]) == set(wallets["wallet_id"]) == set(labels["wallet_id"])


def test_all_causes_present(pops: dict[str, Population]):
    assert set(pops["A"][2]["cause"]) == set(CAUSES)
    assert set(pops["B"][2]["cause"]) == set(CAUSES)


def test_b_differs_from_a(pops: dict[str, Population]):
    (a_wallets, _, a_labels), (b_wallets, _, b_labels) = pops["A"], pops["B"]
    cause_gap = a_labels["cause"].value_counts(normalize=True) - b_labels["cause"].value_counts(normalize=True)
    pay_gap = a_wallets["pay_cycle"].value_counts(normalize=True) - b_wallets["pay_cycle"].value_counts(normalize=True)
    assert cause_gap.abs().max() > 0.05
    assert pay_gap.abs().max() > 0.05
    assert b_labels["blended"].mean() > a_labels["blended"].mean()


@pytest.mark.parametrize("name", ["A", "B"])
def test_every_wallet_is_dormant_with_history(pops: dict[str, Population], name: str):
    weekly = pops[name][1]
    assert weekly["week"].max() == 51
    last_active = pd.Series(weekly[weekly["txn_count"] > 0].groupby("wallet_id")["week"].max())
    assert len(last_active) == weekly["wallet_id"].nunique()  # no wallet without any transaction
    weeks_silent = 51 - last_active
    assert weeks_silent.between(3, 20).all()
    rows = weekly.groupby("wallet_id").size()
    assert (rows >= weeks_silent.reindex(rows.index) + 4).all()  # at least 4 weeks of life before dormancy


@pytest.mark.parametrize("name", ["A", "B"])
def test_weekly_values_are_consistent(pops: dict[str, Population], name: str):
    w = pops[name][1]
    active = w["txn_count"] > 0
    assert (w.loc[active, "amount_bdt"] > 0).all()
    assert (w.loc[~active, "amount_bdt"] == 0).all()
    assert w.loc[active, "app_share"].between(0, 1).all()
    assert w.loc[~active, "app_share"].isna().all()
    assert (w["cashin_count"] + w["cashout_ok"] <= w["txn_count"]).all()
    assert (w[["cashin_count", "cashout_ok", "cashout_fail"]] >= 0).all().all()


@pytest.mark.parametrize("name", ["A", "B"])
def test_fee_shock_goes_quiet_after_fee_week(pops: dict[str, Population], name: str):
    _, weekly, labels = pops[name]
    fee = labels.loc[(labels["cause"] == "fee_shock") & ~labels["blended"], "wallet_id"]
    active = weekly[weekly["wallet_id"].isin(fee) & (weekly["txn_count"] > 0)]
    assert (active.groupby("wallet_id")["week"].max() > PARAMS[name]["fee_week"]).all()


def test_clues_point_to_their_cause_but_also_appear_elsewhere(pops: dict[str, Population]):
    _, weekly, labels = pops["A"]
    per = pd.DataFrame(weekly.groupby("wallet_id")[["cashout_fail", "district_changed"]].sum())
    per = per.join(labels.set_index("wallet_id"))
    clean = per[~per["blended"]]
    fail = pd.Series(clean.groupby(clean["cause"] == "supply_failure")["cashout_fail"].mean())
    moved = pd.Series(clean.groupby(clean["cause"] == "migration")["district_changed"].mean())
    assert fail[True] > 5 * fail[False] > 0  # strong clue, but not exclusive
    assert moved[True] > 5 * moved[False] > 0


def test_same_seed_same_data():
    ids = wallet_ids(50, np.random.default_rng(7))
    first = make_population(PARAMS["A"], ids, np.random.default_rng(1))
    second = make_population(PARAMS["A"], ids, np.random.default_rng(1))
    for x, y in zip(first, second):
        pd.testing.assert_frame_equal(x, y)


def test_different_seeds_give_different_data():
    ids = wallet_ids(50, np.random.default_rng(7))
    first = make_population(PARAMS["A"], ids, np.random.default_rng(1))[1]
    second = make_population(PARAMS["A"], ids, np.random.default_rng(2))[1]
    assert not first.equals(second)


def _clean_ids(labels: pd.DataFrame, cause: str) -> list[str]:
    return list(labels.loc[(labels["cause"] == cause) & ~labels["blended"], "wallet_id"])


def _sums(weekly: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    return pd.DataFrame(weekly.groupby("wallet_id")[cols].sum())


def _last_two_active(weekly: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame(weekly.loc[weekly["txn_count"] > 0].groupby("wallet_id").tail(2))


@pytest.mark.parametrize("name", ["A", "B"])
def test_fee_shock_amount_per_txn_falls_after_fee_week(pops: dict[str, Population], name: str):
    _, weekly, labels = pops[name]
    fee = weekly.loc[weekly["wallet_id"].isin(_clean_ids(labels, "fee_shock")) & (weekly["txn_count"] > 0)]
    before = _sums(fee.loc[fee["week"] < PARAMS[name]["fee_week"]], ["amount_bdt", "txn_count"])
    tail = _sums(_last_two_active(fee), ["amount_bdt", "txn_count"])
    ratio = (tail["amount_bdt"] / tail["txn_count"]) / (before["amount_bdt"] / before["txn_count"])
    assert (ratio.dropna() > 0.9).mean() < 0.05


@pytest.mark.parametrize("name", ["A", "B"])
def test_job_exit_cash_ins_stop_before_activity_does(pops: dict[str, Population], name: str):
    _, weekly, labels = pops[name]
    tail = _sums(_last_two_active(weekly), ["cashin_count", "txn_count"])
    share = tail["cashin_count"] / tail["txn_count"]
    clean = labels[~labels["blended"]].set_index("wallet_id")["cause"]
    by_cause = pd.Series(share.groupby(clean.reindex(share.index)).mean())
    assert by_cause["job_exit"] < 0.5 * by_cause.drop("job_exit").min()


@pytest.mark.parametrize("name", ["A", "B"])
def test_every_clean_migration_wallet_changes_district(pops: dict[str, Population], name: str):
    _, weekly, labels = pops[name]
    flagged = set(weekly.loc[weekly["district_changed"] == 1, "wallet_id"])
    assert set(_clean_ids(labels, "migration")) <= flagged


@pytest.mark.parametrize("name", ["A", "B"])
def test_no_acquisition_week_holds_a_single_cause(pops: dict[str, Population], name: str):
    wallets, _, labels = pops[name]
    cause = labels.set_index("wallet_id")["cause"]
    acquired = wallets.set_index("wallet_id")["acquired_week"].reindex(cause.index)
    assert (pd.Series(cause.groupby(acquired).nunique()) > 1).all()


def test_unsourced_numbers_are_marked_assumed():
    assert "Every number in this file is ASSUMED unless noted" in (generate.__doc__ or "")
