"""File outputs of `python -m datagen.generate` (spec section "Files" and A2 label handling)."""

import inspect
import subprocess
import time
from pathlib import Path

import pandas as pd
import pytest

from datagen.generate import ROOT, main

FILES = [
    "data/train/wallets.parquet",
    "data/train/weekly.parquet",
    "data/train/labels.parquet",
    "data/a_test/wallets.parquet",
    "data/a_test/weekly.parquet",
    "data/b/wallets.parquet",
    "data/b/weekly.parquet",
    "truth/a_test_labels.parquet",
    "truth/b_labels.parquet",
]
LABEL_FILES = {"data/train/labels.parquet", "truth/a_test_labels.parquet", "truth/b_labels.parquet"}


@pytest.fixture(scope="module")
def out(tmp_path_factory: pytest.TempPathFactory) -> Path:
    d = tmp_path_factory.mktemp("gen")
    started = time.perf_counter()
    main(42, d)
    (d / "seconds.txt").write_text(str(time.perf_counter() - started))
    return d


def read(out: Path, name: str) -> pd.DataFrame:
    return pd.read_parquet(out / name)


def test_runs_under_60_seconds(out: Path):
    assert float((out / "seconds.txt").read_text()) < 60


def test_files_and_counts(out: Path):
    for f in FILES:
        assert (out / f).exists(), f
    counts = {"train": 4800, "a_test": 1200, "b": 3000}
    for split, n in counts.items():
        assert len(read(out, f"data/{split}/wallets.parquet")) == n
        assert read(out, f"data/{split}/weekly.parquet")["wallet_id"].nunique() == n
    assert len(read(out, "data/train/labels.parquet")) == 4800
    assert len(read(out, "truth/a_test_labels.parquet")) == 1200
    assert len(read(out, "truth/b_labels.parquet")) == 3000


def test_labels_only_where_allowed(out: Path):
    for f in FILES:
        cols = set(read(out, f).columns)
        if f in LABEL_FILES:
            assert cols == {"wallet_id", "cause", "blended"}, f
        else:
            assert not cols & {"cause", "blended"}, f


def test_splits_are_disjoint_and_match_labels(out: Path):
    train = set(read(out, "data/train/wallets.parquet")["wallet_id"])
    a_test = set(read(out, "data/a_test/wallets.parquet")["wallet_id"])
    b = set(read(out, "data/b/wallets.parquet")["wallet_id"])
    assert not train & a_test and not train & b and not a_test & b
    assert set(read(out, "data/train/labels.parquet")["wallet_id"]) == train
    assert set(read(out, "truth/a_test_labels.parquet")["wallet_id"]) == a_test
    assert set(read(out, "truth/b_labels.parquet")["wallet_id"]) == b


def test_dtypes_survive_parquet(out: Path):
    labels = read(out, "truth/b_labels.parquet")
    weekly = read(out, "data/b/weekly.parquet")
    assert labels["blended"].dtype == bool
    assert weekly["app_share"].dtype == float
    for col in ["week", "txn_count", "amount_bdt", "cashin_count", "cashout_ok", "cashout_fail", "district_changed"]:
        assert pd.api.types.is_integer_dtype(weekly[col]), col


def test_default_output_is_repo_root():
    assert inspect.signature(main).parameters["out"].default == ROOT == Path(__file__).resolve().parents[1]


def test_generated_data_is_git_ignored():
    def ignored(path: str) -> bool:
        return subprocess.run(["git", "check-ignore", "-q", path], cwd=ROOT, check=False).returncode == 0

    for path in ["data/train/weekly.parquet", "data/a_test/weekly.parquet", "data/b/weekly.parquet",
                 "truth/b_labels.parquet", "truth/a_test_labels.parquet"]:
        assert ignored(path), path
    assert not ignored("truth/.gitkeep")
