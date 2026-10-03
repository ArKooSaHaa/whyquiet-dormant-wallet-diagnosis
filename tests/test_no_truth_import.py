"""Import guard: src/model must never read or reference truth/ (AMENDMENT A2)."""

from pathlib import Path

SRC_MODEL = Path(__file__).resolve().parent.parent / "src" / "model"


def test_no_truth_reference_in_model():
    if not SRC_MODEL.exists():
        return
    offenders = []
    for f in SRC_MODEL.rglob("*.py"):
        text = f.read_text(encoding="utf-8", errors="replace")
        if 'import truth' in text or 'from truth' in text or '"truth"' in text or "'truth'" in text:
            offenders.append(str(f))
    assert not offenders, f"src/model must never touch truth/: {offenders}"
