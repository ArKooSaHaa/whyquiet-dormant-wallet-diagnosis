"""Runtime guard: shap is OFFLINE ONLY — nothing under src/ may import it."""

from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"


def test_no_shap_import_in_runtime():
    offenders = []
    for f in SRC.rglob("*.py"):
        text = f.read_text(encoding="utf-8", errors="replace")
        if "import shap" in text or "from shap" in text:
            offenders.append(str(f))
    assert not offenders, f"shap must stay in the offline group, not imported under src/: {offenders}"
