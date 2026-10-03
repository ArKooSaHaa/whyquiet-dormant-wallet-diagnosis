"""Export the FastAPI OpenAPI spec to web/src/api/openapi.json without a running server."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.api.main import app

out = ROOT / "web" / "src" / "api" / "openapi.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(app.openapi(), indent=2), encoding="utf-8")
print(f"wrote {out}")

