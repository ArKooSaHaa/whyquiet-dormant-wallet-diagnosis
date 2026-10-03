"""verify-deploy: check a deployed URL's health endpoints. Usage: python scripts/verify_deploy.py <URL>"""

import sys

import httpx


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python scripts/verify_deploy.py <URL>")
        return 2
    base = sys.argv[1].rstrip("/")
    failures = []

    r = httpx.get(f"{base}/api/health", timeout=30)
    print(f"GET /api/health -> {r.status_code} {r.text[:120]}")
    if r.status_code != 200 or r.json().get("status") != "ok":
        failures.append("/api/health")

    r = httpx.get(f"{base}/api/openapi.json", timeout=30)
    print(f"GET /api/openapi.json -> {r.status_code}")
    if r.status_code != 200:
        failures.append("/api/openapi.json")

    r = httpx.get(base, timeout=30)
    print(f"GET / -> {r.status_code}")
    if r.status_code != 200 or "WhyQuiet" not in r.text:
        failures.append("/ (title)")

    if failures:
        print(f"FAIL: {failures}")
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
