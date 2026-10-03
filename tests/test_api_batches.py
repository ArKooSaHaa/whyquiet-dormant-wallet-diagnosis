from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError, AuthRetryableError

from src.api.auth import supabase_client
from src.api.main import app
from src.rules.remedies import REMEDIES

BATCH_ID = "11111111-1111-1111-1111-111111111111"
ANALYST = SimpleNamespace(id="aaaa", app_metadata={"role": "analyst"})
APPROVER = SimpleNamespace(id="bbbb", app_metadata={"role": "approver"})
NOROLE = SimpleNamespace(id="cccc", app_metadata={})
TOKENS = {"t-analyst": ANALYST, "t-approver": APPROVER, "t-norole": NOROLE}


def row(**over):
    base = {
        "id": BATCH_ID, "cause": "job_exit", "remedy_code": "job_exit_payroll_reengage",
        "unit_cost_paisa": 1500, "wallet_count": 2, "status": "proposed", "proposed_by": "aaaa",
        "decided_by": None, "decided_at": None, "decision_note": None,
        "created_at": "2026-10-03T15:00:00+00:00",
    }
    return {**base, **over}


class Query:
    def __init__(self, data):
        self.data = data

    def __getattr__(self, _name):  # select / eq / order -> chainable
        return lambda *a, **k: self

    def execute(self):
        return self


class FakeSupabase:
    def __init__(self, rpc_result=None, rpc_error=None, tables=None):
        self.rpc_result, self.rpc_error, self.tables = rpc_result, rpc_error, tables or {}
        self.rpc_calls: list[tuple[str, dict]] = []
        self.auth = SimpleNamespace(get_user=self._get_user, sign_in_with_password=self._sign_in)

    def _get_user(self, jwt):
        if jwt not in TOKENS:
            raise AuthApiError("invalid JWT", 401, None)
        return SimpleNamespace(user=TOKENS[jwt])

    def _sign_in(self, creds):
        if creds["password"] != "right":
            raise AuthApiError("Invalid login credentials", 400, None)
        return SimpleNamespace(session=SimpleNamespace(access_token="jwt-123"), user=APPROVER)

    def rpc(self, fn, params):
        self.rpc_calls.append((fn, params))
        if self.rpc_error:
            raise self.rpc_error
        return Query(self.rpc_result)

    def table(self, name):
        return Query(self.tables.get(name, []))


@pytest.fixture
def fake():
    sb = FakeSupabase()
    app.dependency_overrides[supabase_client] = lambda: sb
    yield sb
    app.dependency_overrides.clear()


client = TestClient(app)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def db_error(code):
    return APIError({"code": code, "message": "db says no"})


# ── offline ──────────────────────────────────────────────────────────────────
def test_503_when_supabase_env_missing(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    r = client.get("/api/batches")
    assert r.status_code == 503
    assert r.json() == {"detail": "Write path offline"}


# ── login ────────────────────────────────────────────────────────────────────
def test_login_ok(fake):
    r = client.post("/api/auth/login", json={"email": "approver@whyquiet.demo", "password": "right"})
    assert r.status_code == 200
    assert r.json() == {"access_token": "jwt-123", "user_id": "bbbb", "role": "approver"}


def test_login_bad_credentials(fake):
    r = client.post("/api/auth/login", json={"email": "x@y.z", "password": "wrong"})
    assert r.status_code == 401


def test_login_422(fake):
    assert client.post("/api/auth/login", json={"email": "x@y.z"}).status_code == 422


# ── list ─────────────────────────────────────────────────────────────────────
def test_list_batches_public(fake):
    fake.tables["batch_summaries"] = [row()]
    r = client.get("/api/batches")
    assert r.status_code == 200
    assert r.json()[0]["unit_cost_bdt"] == 15.0


# ── propose ──────────────────────────────────────────────────────────────────
PROPOSE = {"cause": "fee_shock", "wallet_ids": ["W-ABC123", "W-XYZ789"]}


def test_propose_requires_token(fake):
    assert client.post("/api/batches", json=PROPOSE).status_code == 401
    assert client.post("/api/batches", json=PROPOSE, headers=auth("bogus")).status_code == 401


def test_propose_requires_analyst(fake):
    assert client.post("/api/batches", json=PROPOSE, headers=auth("t-approver")).status_code == 403
    assert client.post("/api/batches", json=PROPOSE, headers=auth("t-norole")).status_code == 403
    assert fake.rpc_calls == []


def test_propose_ok_uses_rules_not_client(fake):
    fake.rpc_result = row(cause="fee_shock", remedy_code="fee_shock_waiver", unit_cost_paisa=2500)
    r = client.post("/api/batches", json=PROPOSE, headers=auth("t-analyst"))
    assert r.status_code == 200
    assert r.json()["status"] == "proposed"
    fn, params = fake.rpc_calls[0]
    assert fn == "propose_batch"
    assert params["p_actor"] == "aaaa"
    assert params["p_remedy_code"] == REMEDIES["fee_shock"]["remedy_code"]
    assert params["p_unit_cost_paisa"] == round(REMEDIES["fee_shock"]["unit_cost_bdt"] * 100)


def test_propose_409_wallet_in_open_batch(fake):
    fake.rpc_error = db_error("23505")
    r = client.post("/api/batches", json=PROPOSE, headers=auth("t-analyst"))
    assert r.status_code == 409


@pytest.mark.parametrize(
    "bad",
    [
        {"cause": "invalid_cause", "wallet_ids": ["W-ABC123"]},
        {"cause": "job_exit", "wallet_ids": []},
        {"cause": "job_exit", "wallet_ids": ["w-abc123"]},
        {"cause": "job_exit", "wallet_ids": ["W-ABC123"] * 1001},
    ],
)
def test_propose_422(fake, bad):
    assert client.post("/api/batches", json=bad, headers=auth("t-analyst")).status_code == 422


# ── approve / reject ─────────────────────────────────────────────────────────
@pytest.mark.parametrize("action,status", [("approve", "approved"), ("reject", "rejected")])
def test_decide_ok(fake, action, status):
    fake.rpc_result = row(status=status, decided_by="bbbb", decided_at="2026-10-03T16:00:00+00:00",
                          decision_note="looks right")
    r = client.post(f"/api/batches/{BATCH_ID}/{action}", json={"note": "looks right"}, headers=auth("t-approver"))
    assert r.status_code == 200
    assert r.json()["status"] == status
    assert fake.rpc_calls[0] == (
        "decide_batch", {"p_actor": "bbbb", "p_batch_id": BATCH_ID, "p_status": status, "p_note": "looks right"}
    )


def test_decide_requires_approver(fake):
    r = client.post(f"/api/batches/{BATCH_ID}/approve", json={"note": "x"}, headers=auth("t-analyst"))
    assert r.status_code == 403
    assert fake.rpc_calls == []


@pytest.mark.parametrize("code,status", [("42501", 403), ("P0002", 404), ("55000", 409)])
def test_decide_db_errors(fake, code, status):
    fake.rpc_error = db_error(code)
    r = client.post(f"/api/batches/{BATCH_ID}/approve", json={"note": "x"}, headers=auth("t-approver"))
    assert r.status_code == status


def test_self_approval_message(fake):
    fake.rpc_error = db_error("42501")
    r = client.post(f"/api/batches/{BATCH_ID}/reject", json={"note": "x"}, headers=auth("t-approver"))
    assert r.json()["detail"] == "You cannot decide a batch you proposed"


@pytest.mark.parametrize("body", [{"note": ""}, {"note": "a" * 501}, {}])
def test_decide_422(fake, body):
    r = client.post(f"/api/batches/{BATCH_ID}/approve", json=body, headers=auth("t-approver"))
    assert r.status_code == 422


def test_decide_401(fake):
    assert client.post(f"/api/batches/{BATCH_ID}/approve", json={"note": "x"}).status_code == 401


# ── export ───────────────────────────────────────────────────────────────────
def test_export_ok(fake):
    fake.tables["batch_summaries"] = [row(status="approved", decided_by="bbbb",
                                          decided_at="2026-10-03T16:00:00+00:00", decision_note="ok")]
    fake.tables["batch_wallets"] = [{"wallet_id": "W-ABC123"}, {"wallet_id": "W-XYZ789"}]
    r = client.get(f"/api/batches/{BATCH_ID}/export")
    assert r.status_code == 200
    body = r.json()
    assert body["wallet_ids"] == ["W-ABC123", "W-XYZ789"]
    assert body["cost_bdt"] == 30.0
    assert body["approved_by"] == "bbbb"


def test_export_404(fake):
    assert client.get(f"/api/batches/{BATCH_ID}/export").status_code == 404


def test_export_409_not_approved(fake):
    fake.tables["batch_summaries"] = [row()]
    assert client.get(f"/api/batches/{BATCH_ID}/export").status_code == 409


# ── edge cases & auth hardening ──────────────────────────────────────────────
@pytest.mark.parametrize(
    "auth_hdr",
    [
        "Basic dXNlcjpwYXNz",
        "Token abcdef",
        "Bearer",
        "Bearer   ",
        "random_string_no_scheme",
    ],
)
def test_auth_header_malformed(fake, auth_hdr):
    r = client.post("/api/batches", json=PROPOSE, headers={"Authorization": auth_hdr})
    assert r.status_code == 401
    assert r.json()["detail"] == "Missing bearer token"


def test_whitespace_decision_note_422(fake):
    r = client.post(f"/api/batches/{BATCH_ID}/approve", json={"note": "    "}, headers=auth("t-approver"))
    assert r.status_code == 422


@pytest.mark.parametrize(
    "bad_wallet_id",
    [
        "W-123",        # too short
        "W-1234567",    # too long
        "w-abcdef",     # lowercase
        "12345678",     # missing prefix
        "W-!@#$%^",     # special characters
    ],
)
def test_propose_invalid_wallet_id_format(fake, bad_wallet_id):
    r = client.post(
        "/api/batches",
        json={"cause": "job_exit", "wallet_ids": [bad_wallet_id]},
        headers=auth("t-analyst"),
    )
    assert r.status_code == 422


def test_full_workflow_consistency(fake):
    # 1. Propose batch
    fake.rpc_result = row(cause="migration", remedy_code="migration_agent_referral", unit_cost_paisa=1000)
    res_prop = client.post(
        "/api/batches",
        json={"cause": "migration", "wallet_ids": ["W-MIG001", "W-MIG002"]},
        headers=auth("t-analyst"),
    )
    assert res_prop.status_code == 200
    batch_data = res_prop.json()
    assert batch_data["status"] == "proposed"
    assert batch_data["unit_cost_bdt"] == 10.0

    # 2. Approve batch
    fake.rpc_result = row(
        cause="migration",
        remedy_code="migration_agent_referral",
        unit_cost_paisa=1000,
        status="approved",
        decided_by="bbbb",
        decided_at="2026-10-03T17:00:00+00:00",
        decision_note="Batch approved for migration outreach",
    )
    res_app = client.post(
        f"/api/batches/{BATCH_ID}/approve",
        json={"note": "Batch approved for migration outreach"},
        headers=auth("t-approver"),
    )
    assert res_app.status_code == 200
    approved_batch = res_app.json()
    assert approved_batch["status"] == "approved"
    assert approved_batch["decision_note"] == "Batch approved for migration outreach"

    # 3. Export batch
    fake.tables["batch_summaries"] = [
        row(
            cause="migration",
            remedy_code="migration_agent_referral",
            unit_cost_paisa=1000,
            status="approved",
            decided_by="bbbb",
            decided_at="2026-10-03T17:00:00+00:00",
        )
    ]
    fake.tables["batch_wallets"] = [{"wallet_id": "W-MIG001"}, {"wallet_id": "W-MIG002"}]
    res_exp = client.get(f"/api/batches/{BATCH_ID}/export")
    assert res_exp.status_code == 200
    exp_data = res_exp.json()
    assert exp_data["batch_id"] == BATCH_ID
    assert exp_data["cause"] == "migration"
    assert exp_data["remedy_code"] == "migration_agent_referral"
    assert exp_data["wallet_ids"] == ["W-MIG001", "W-MIG002"]
    assert exp_data["cost_bdt"] == 20.0  # 10.0 BDT * 2 wallets
    assert exp_data["approved_by"] == "bbbb"


# ── Supabase unreachable -> 503 "Write path offline", never 401 (contract) ──────
def _down(err):
    def raise_(*_a, **_k):
        raise err
    return raise_


@pytest.mark.parametrize("err", [httpx.ConnectError("down"), AuthRetryableError("down", 503)])
def test_503_when_auth_unreachable(fake, err):
    fake.auth.get_user = _down(err)
    r = client.post("/api/batches", json=PROPOSE, headers=auth("t-analyst"))
    assert r.status_code == 503
    assert r.json() == {"detail": "Write path offline"}


def test_503_when_db_unreachable(fake):
    fake.table = _down(httpx.ConnectError("down"))
    assert client.get("/api/batches").status_code == 503
