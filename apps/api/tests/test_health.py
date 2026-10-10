from fastapi.testclient import TestClient

from app.main import app


def test_health_reports_db_redis_and_vector() -> None:
    # Needs db and redis (`npm run infra` locally, services in CI) and `alembic upgrade head`.
    with TestClient(app) as client:
        response = client.get("/api/health")
    body = response.json()
    assert response.status_code == 200, body
    assert body["status"] == "ok"
    assert body["db"] and body["redis"] and body["vector"]
