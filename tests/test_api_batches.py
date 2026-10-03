import pytest
from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)


def test_auth_login_stub():
    r = client.post("/api/auth/login", json={"email": "analyst@whyquiet.demo", "password": "secretpassword"})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert "user_id" in body
    assert body["role"] in ("analyst", "approver")


def test_auth_login_validation_error():
    r = client.post("/api/auth/login", json={"email": "not-an-email"})
    # Missing password
    assert r.status_code == 422


def test_get_batches_stub():
    r = client.get("/api/batches")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    if len(body) > 0:
        batch = body[0]
        assert "id" in batch
        assert "cause" in batch
        assert "remedy_code" in batch
        assert "unit_cost_bdt" in batch
        assert "wallet_count" in batch
        assert "status" in batch
        assert "proposed_by" in batch
        assert "created_at" in batch


def test_create_batch_stub():
    payload = {
        "cause": "job_exit",
        "wallet_ids": ["W-ABC123", "W-XYZ789"],
    }
    r = client.post("/api/batches", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["cause"] == "job_exit"
    assert body["wallet_count"] == 2
    assert body["status"] == "proposed"


@pytest.mark.parametrize(
    "bad_payload",
    [
        {"cause": "invalid_cause", "wallet_ids": ["W-ABC123"]},
        {"cause": "job_exit", "wallet_ids": []},
        {"cause": "job_exit", "wallet_ids": ["invalid_wallet_id"]},
    ],
)
def test_create_batch_validation_error(bad_payload):
    r = client.post("/api/batches", json=bad_payload)
    assert r.status_code == 422


def test_approve_batch_stub():
    r = client.post("/api/batches/batch-123/approve", json={"note": "Approved for campaign test"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "approved"
    assert body["decision_note"] == "Approved for campaign test"
    assert body["decided_by"] is not None


def test_approve_batch_validation_error():
    # empty note or note exceeding 500 chars
    r = client.post("/api/batches/batch-123/approve", json={"note": ""})
    assert r.status_code == 422

    r_long = client.post("/api/batches/batch-123/approve", json={"note": "a" * 501})
    assert r_long.status_code == 422


def test_reject_batch_stub():
    r = client.post("/api/batches/batch-123/reject", json={"note": "Rejected due to budget limits"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "rejected"
    assert body["decision_note"] == "Rejected due to budget limits"


def test_reject_batch_validation_error():
    r = client.post("/api/batches/batch-123/reject", json={"note": ""})
    assert r.status_code == 422


def test_export_batch_stub():
    r = client.get("/api/batches/batch-123/export")
    assert r.status_code == 200
    body = r.json()
    assert "batch_id" in body
    assert "cause" in body
    assert "remedy_code" in body
    assert "wallet_ids" in body
    assert "cost_bdt" in body
    assert "approved_by" in body
    assert "approved_at" in body
