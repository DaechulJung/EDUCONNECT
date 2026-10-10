"""BASE-01.7: /api/test/* exists only with ENABLE_TEST_ROUTES=1, otherwise 404."""

import pytest
from fastapi.testclient import TestClient

from app.core import clock
from app.core.config import Settings
from app.main import create_app

TEST_ROUTES = [
    ("POST", "/api/test/reset", None),
    ("POST", "/api/test/clock", {"advance_minutes": 0}),
    ("POST", "/api/test/llm", {"task": "t", "mode": "error"}),
    ("GET", "/api/test/llm/requests", None),
]


@pytest.mark.parametrize(("method", "path", "body"), TEST_ROUTES)
def test_test_routes_are_404_when_disabled(method, path, body) -> None:
    with TestClient(create_app(Settings(enable_test_routes=False))) as client:
        assert client.request(method, path, json=body).status_code == 404


def test_test_routes_work_when_enabled() -> None:
    with TestClient(create_app(Settings(enable_test_routes=True))) as client:
        before = clock.now()
        moved = client.post("/api/test/clock", json={"advance_minutes": 15})
        assert moved.status_code == 200
        assert (clock.now() - before).total_seconds() >= 15 * 60

        fixed = {"task": "extract_conditions", "mode": "fixed", "response": {"a": 1}}
        assert client.post("/api/test/llm", json=fixed).json() == fixed
        assert client.get("/api/test/llm/requests").json() == []

        assert client.post("/api/test/reset").json() == {"reset": True}
        assert (clock.now() - before).total_seconds() < 60  # reset puts the clock back
