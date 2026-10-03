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
