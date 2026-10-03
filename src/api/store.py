import json
import os
import tempfile
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from pathlib import Path


class AuditStore(ABC):
    @abstractmethod
    def log_triage(self, record: dict) -> None: ...

    @abstractmethod
    def kind(self) -> str: ...


class LocalFileStore(AuditStore):
    """Default store. Writes JSONL under ./.local/ (or /tmp on Vercel)."""

    def __init__(self) -> None:
        base = os.environ.get("LOCAL_STORE_DIR") or tempfile.gettempdir()
        self.path = Path(base) / "whyquiet-audit.jsonl"
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def log_triage(self, record: dict) -> None:
        record = {**record, "logged_at": datetime.now(UTC).isoformat()}
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")

    def kind(self) -> str:
        return "local"



class SupabaseStore(AuditStore):
    """Server-side only. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

    The service-role key must never reach the client bundle.
    """

    def __init__(self) -> None:
        from supabase import create_client

        self.client = create_client(
            os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        )

    def log_triage(self, record: dict) -> None:
        self.client.table("triage_audit_log").insert(record).execute()

    def kind(self) -> str:
        return "supabase"


def get_store() -> AuditStore:
    if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        return SupabaseStore()
    return LocalFileStore()
