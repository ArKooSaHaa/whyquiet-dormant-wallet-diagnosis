from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)



def test_health_ok():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["store"] in ("local", "supabase")


def test_docs_served_at_api_docs():
    assert client.get("/api/docs").status_code == 200
    assert client.get("/api/openapi.json").status_code == 200


def test_triage_contract():
    r = client.post("/api/triage", json={"wallet_id": "w-001"})
    assert r.status_code == 200
    body = r.json()
    assert body["verdict"] in ("attributed", "refused")
    assert "posterior" in body and "reasons" in body
    assert "assumptions" in body and "generated_text" in body


def test_refuse_is_first_class():
    r = client.post("/api/refuse", json={"wallet_id": "w-002"})
    assert r.status_code == 200
    assert r.json()["verdict"] == "refused"
