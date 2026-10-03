import os


def store_kind() -> str:
    """'supabase' when the write path is configured, else 'local' (read-only demo)."""
    return "supabase" if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY") else "local"
