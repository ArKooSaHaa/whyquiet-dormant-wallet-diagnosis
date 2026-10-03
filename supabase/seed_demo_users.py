"""Create/update the two demo accounts with app_metadata.role. Idempotent.

Usage (passwords from env, never from git):
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  DEMO_ANALYST_PASSWORD=... DEMO_APPROVER_PASSWORD=... \
  uv run python supabase/seed_demo_users.py
"""

import os
import sys

from supabase import create_client

ACCOUNTS = {
    "analyst@whyquiet.demo": ("analyst", "DEMO_ANALYST_PASSWORD"),
    "approver@whyquiet.demo": ("approver", "DEMO_APPROVER_PASSWORD"),
}


def main() -> int:
    missing = [v for v in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEMO_ANALYST_PASSWORD",
                           "DEMO_APPROVER_PASSWORD") if not os.environ.get(v)]
    if missing:
        print(f"missing env vars: {missing}")
        return 2
    admin = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]).auth.admin
    existing = {u.email: u.id for u in admin.list_users()}
    for email, (role, pw_var) in ACCOUNTS.items():
        attrs = {"password": os.environ[pw_var], "email_confirm": True, "app_metadata": {"role": role}}
        if email in existing:
            admin.update_user_by_id(existing[email], attrs)  # type: ignore[arg-type]
            print(f"updated {email} -> {role}")
        else:
            admin.create_user({"email": email, **attrs})  # type: ignore[arg-type]
            print(f"created {email} -> {role}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
