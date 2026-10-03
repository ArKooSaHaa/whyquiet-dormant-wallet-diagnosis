"""scripts/export_seed.py writes web/public/seed.json in the shape of docs/contracts/seed-bundle.md."""

import json
import re
from pathlib import Path

import pytest

from scripts.export_seed import HONESTY_LINE, export
from src.model.train import CAUSES

CAUSE_SET = set(CAUSES)


@pytest.fixture(scope="module")
def out(tmp_path_factory: pytest.TempPathFactory) -> Path:
    root = tmp_path_factory.mktemp("export")
    path = root / "seed.json"
    export(0, root, path)
    return path


@pytest.fixture(scope="module")
def bundle(out: Path) -> dict:
    return json.loads(out.read_text(encoding="utf-8"))


def test_top_level_and_meta(bundle: dict, out: Path):
    assert set(bundle) == {"meta", "wallets", "report", "remedies"}
    meta = bundle["meta"]
    assert set(meta) == {"generated_at", "seed", "model_version", "tau", "delta", "n_wallets_b_total", "honesty_line"}
    assert meta["seed"] == 0 and meta["n_wallets_b_total"] == 3000
    assert meta["honesty_line"] == HONESTY_LINE
    assert 0.5 <= meta["tau"] <= 0.9 and 0.1 <= meta["delta"] <= 0.4
    assert out.stat().st_size < 3_000_000


def test_wallet_sample_is_stratified_with_refusals(bundle: dict):
    wallets = bundle["wallets"]
    assert 0 < len(wallets) <= 400
    assert len({w["wallet_id"] for w in wallets}) == len(wallets)
    refused = [w for w in wallets if w["verdict"] == "refused"]
    assert len(refused) >= 0.2 * len(wallets)
    assert {w["cause"] for w in wallets if w["verdict"] == "attributed"} == CAUSE_SET


def test_each_wallet_matches_contract(bundle: dict):
    for w in bundle["wallets"]:
        assert re.fullmatch(r"W-[0-9A-Z]{6}", w["wallet_id"])
        assert w["pay_cycle"] in {"weekly", "biweekly", "monthly"}
        assert (w["cause"] is None) == (w["verdict"] == "refused") == bool(w["refusal_reasons"])
        assert set(w["posterior"]) == CAUSE_SET and abs(sum(w["posterior"].values()) - 1) < 0.01
        assert w["series"] and set(w["series"][0]) == {"week", "txn_count", "amount_bdt"}
        assert w["series"][-1]["week"] == 51
        assert sum(s["txn_count"] for s in w["series"][-w["weeks_silent"]:]) == 0
        c = w["contributions"]
        assert 0 < len(c) <= 8 and set(c[0]) == {"feature", "value", "contribution"}
        assert [abs(x["contribution"]) for x in c] == sorted((abs(x["contribution"]) for x in c), reverse=True)
        assert w["rule_baseline"] == {"fired": True, "action": "message_everyone"}  # every wallet is >= 3 weeks silent


def test_report_and_remedies(bundle: dict):
    report = bundle["report"]
    assert set(report) == {"ml", "confusion_b", "fairness", "money", "assumptions"}
    assert report["ml"]["macro_f1_b"] > report["ml"]["rule_baseline_f1_b"]
    assert len(report["money"]) == 9
    assert {(r["strategy"], r["recovery_rate"]) for r in report["money"]} == {
        (s, r) for s in ("rule", "model", "oracle") for r in (0.01, 0.04, 0.08)}
    assert report["assumptions"] and all("ASSUMED" in a for a in report["assumptions"])
    assert set(bundle["remedies"]) == CAUSE_SET
