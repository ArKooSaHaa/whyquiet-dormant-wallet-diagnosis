import sys
from pathlib import Path

# Ensure project root is in sys.path for Vercel serverless execution
_ROOT = str(Path(__file__).resolve().parent.parent)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from src.api.main import app

__all__ = ["app"]

