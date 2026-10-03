"""verify-deploy: check a deployed URL's health endpoints. Usage: python scripts/verify_deploy.py <URL>"""

import sys

import httpx


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: python scripts/verify_deploy.py <URL> [--allow-offline]")
        return 2
    base = sys.argv[1].rstrip("/")
    allow_offline = "--allow-offline" in sys.argv
    failures = []

    try:
        r = httpx.get(f"{base}/api/health", timeout=30)
        print(f"GET /api/health -> {r.status_code} {r.text[:120]}")
        if r.status_code != 200 or r.json().get("status") != "ok":
            failures.append("/api/health")
    except Exception as exc:  # noqa: BLE001
        print(f"GET /api/health -> EXCEPTION: {exc}")
        failures.append(f"/api/health ({exc})")

    try:
        r = httpx.get(f"{base}/api/openapi.json", timeout=30)
        print(f"GET /api/openapi.json -> {r.status_code}")
        if r.status_code != 200:
            failures.append("/api/openapi.json")
    except Exception as exc:  # noqa: BLE001
        print(f"GET /api/openapi.json -> EXCEPTION: {exc}")
        failures.append(f"/api/openapi.json ({exc})")

    try:
        r = httpx.get(f"{base}/api/batches", timeout=30)
        print(f"GET /api/batches -> {r.status_code} {r.text[:120]}")
        if r.status_code == 503 and allow_offline:
            print("  (Write path offline allowed via --allow-offline)")
        elif r.status_code != 200:  # 503 = Supabase env missing, 500 = migration not applied
            failures.append("/api/batches (write path)")
    except Exception as exc:  # noqa: BLE001
        print(f"GET /api/batches -> EXCEPTION: {exc}")
        failures.append(f"/api/batches ({exc})")

    try:
        r = httpx.get(base, timeout=30)
        print(f"GET / -> {r.status_code}")
        if r.status_code != 200 or "WhyQuiet" not in r.text:
            failures.append("/ (title)")
    except Exception as exc:  # noqa: BLE001
        print(f"GET / -> EXCEPTION: {exc}")
        failures.append(f"/ ({exc})")

    if failures:
        print(f"FAIL: {failures}")
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
