"""BASE-01.2: every path in arch 'API·데이터·권한 경계' is registered with request and response
schemas, and routes not implemented yet answer 501. Also the AD-8 rule that routers never
raise HTTPException(401·403·404) themselves."""

import re
from pathlib import Path

import pytest

from app.core.config import settings
from app.main import create_app
from tests.conftest import login

app = create_app(settings.model_copy(update={"enable_test_routes": False}))

# arch.md 'API·데이터·권한 경계' (method, path, role allowed, implemented by the foundation)
ROUTES = [
    ("POST", "/api/auth/login", None, True),
    ("POST", "/api/auth/logout", "any", True),
    ("GET", "/api/auth/me", "any", True),
    ("GET", "/api/academy/programs", "academy", False),
    ("POST", "/api/academy/programs", "academy", False),
    ("PUT", "/api/academy/programs/{program_id}", "academy", False),
    ("DELETE", "/api/academy/programs/{program_id}", "academy", False),
    ("GET", "/api/school/timetable", "school", False),
    ("PUT", "/api/school/timetable", "school", False),
    ("GET", "/api/school/after-school", "school", False),
    ("POST", "/api/school/after-school", "school", False),
    ("PUT", "/api/school/after-school/{program_id}", "school", False),
    ("DELETE", "/api/school/after-school/{program_id}", "school", False),
    ("GET", "/api/children", "parent", True),
    ("POST", "/api/children", "parent", False),
    ("GET", "/api/children/{child_id}", "parent", False),
    ("PUT", "/api/children/{child_id}", "parent", False),
    ("POST", "/api/chat/messages", "parent", True),
    ("GET", "/api/children/{child_id}/conditions", "parent", True),
    ("PUT", "/api/children/{child_id}/conditions", "parent", True),
    ("GET", "/api/catalog/subjects", "any", False),
    ("POST", "/api/recommendations", "parent", False),
    ("POST", "/api/plans/draft", "parent", False),
    ("GET", "/api/plans", "parent", False),
    ("GET", "/api/plans/{plan_id}", "parent", False),
    ("PUT", "/api/plans/{plan_id}", "parent", False),
    ("POST", "/api/plans/{plan_id}/confirm", "parent", False),
    ("GET", "/api/plans/{plan_id}/adjustment", "parent", False),
    ("POST", "/api/plans/{plan_id}/adjustment/accept", "parent", False),
    ("POST", "/api/plans/{plan_id}/adjustment/reject", "parent", False),
    ("GET", "/api/org/impact", "org", False),
    ("GET", "/api/meta", None, False),
    ("GET", "/api/health", None, True),
]

# Minimal valid bodies so 501 (not 422) is what an unimplemented route returns.
PROGRAM = {
    "subject": "수학", "type": "academy", "days": ["mon"], "start": "16:00", "end": "17:00",
    "monthly_tuition": 200000, "monthly_other": 0, "instructor": "강사", "grade_min": 4,
    "grade_max": 6, "capacity": 10, "enrolled": 3, "lat": 37.5, "lng": 127.0,
}  # fmt: skip
AFTER_SCHOOL = {k: v for k, v in PROGRAM.items() if k not in ("type", "lat", "lng")}
CHILD = {"alias": "하늘", "age": 11, "grade": 5, "consent_checked": True}
BODIES = {
    ("POST", "/api/academy/programs"): PROGRAM,
    ("PUT", "/api/academy/programs/{program_id}"): PROGRAM,
    ("PUT", "/api/school/timetable"): {"entries": []},
    ("POST", "/api/school/after-school"): AFTER_SCHOOL,
    ("PUT", "/api/school/after-school/{program_id}"): AFTER_SCHOOL,
    ("POST", "/api/children"): CHILD,
    ("PUT", "/api/children/{child_id}"): CHILD,
    ("POST", "/api/chat/messages"): {"child_id": "x", "text": "안녕하세요"},
    ("PUT", "/api/children/{child_id}/conditions"): {"budget_target": 0, "budget_cap": 0},
    ("POST", "/api/recommendations"): {"child_id": "x"},
    ("POST", "/api/plans/draft"): {"child_id": "x"},
    ("PUT", "/api/plans/{plan_id}"): {"program_ids": []},
}


def registered() -> set[tuple[str, str]]:
    """Paths as OpenAPI publishes them (what the generated client sees)."""
    paths = app.openapi()["paths"]
    return {(method.upper(), path) for path, item in paths.items() for method in item}


def test_route_list_matches_arch_table() -> None:
    api = {pair for pair in registered() if pair[1].startswith("/api/")}
    assert api == {(m, p) for m, p, _, _ in ROUTES}


@pytest.mark.parametrize(("method", "path"), [(m, p) for m, p, _, _ in ROUTES])
def test_openapi_has_request_and_response_schemas(method: str, path: str) -> None:
    operation = app.openapi()["paths"][path][method.lower()]
    responses = operation["responses"]
    success = next(code for code in responses if code.startswith("2"))
    if success != "204":
        assert "schema" in responses[success]["content"]["application/json"]
    if (method, path) in BODIES or path in ("/api/auth/login",):
        assert "schema" in operation["requestBody"]["content"]["application/json"]


def _session_for(role: str, make_account, client) -> None:
    actual = {"any": "parent", "org": "academy"}.get(role, role)
    login_id, _, _ = make_account(actual)
    assert login(client, login_id).status_code == 200


@pytest.mark.parametrize(
    ("method", "path", "role"), [(m, p, r) for m, p, r, done in ROUTES if not done]
)
def test_unimplemented_routes_return_501(method, path, role, client, make_account) -> None:
    client.cookies.clear()
    if role is not None:
        _session_for(role, make_account, client)
    url = path.replace("{program_id}", "p1").replace("{child_id}", "c1").replace("{plan_id}", "x")
    response = client.request(method, url, json=BODIES.get((method, path)))
    assert response.status_code == 501, response.text
    assert response.json() == {"detail": "not_implemented"}


def test_routers_never_raise_http_exceptions_directly() -> None:
    api_dir = Path(__file__).resolve().parents[1] / "app" / "api"
    offenders = [
        f"{path.name}:{number}"
        for path in api_dir.glob("*.py")
        for number, line in enumerate(path.read_text().splitlines(), 1)
        if re.search(r"HTTPException\s*\(", line)
    ]
    assert offenders == []
