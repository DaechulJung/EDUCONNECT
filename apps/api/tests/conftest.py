"""Shared fixtures. Needs db and redis (`npm run infra`, CI services) and `alembic upgrade head`.

Test rows are written with a separate sync engine, so they never share the app's event loop.
"""

import os
import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.core import clock
from app.core.config import Settings, settings
from app.core.safety import assert_own_database_sync
from app.main import create_app
from app.services.auth.passwords import hash_password

# Per run, never a seed value; the same in `conftest` and `tests.conftest` imports.
TEST_PASSWORD = os.environ.setdefault("EDU_TEST_PASSWORD", "test-only-" + uuid.uuid4().hex[:8])
# Seed accounts in tests use the same per-run value, never the SEED_PASSWORD from .env.
settings.seed_password = TEST_PASSWORD


@pytest.fixture(scope="session")
def sync_db():
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        assert_own_database_sync(conn)  # tests INSERT/DELETE: never in another project's database
    yield engine
    engine.dispose()


@pytest.fixture(scope="session")
def password_hash() -> str:
    return hash_password(TEST_PASSWORD)


@pytest.fixture
def make_account(sync_db, password_hash):
    """Create an institution (for staff) and an account; returns (login_id, account_id, inst)."""
    created: list[tuple[str, str | None]] = []

    def make(role: str = "parent") -> tuple[str, str, str | None]:
        account_id, login_id = str(uuid.uuid4()), f"t-{role}-{uuid.uuid4().hex[:8]}"
        institution_id = None
        with sync_db.begin() as conn:
            if role != "parent":
                institution_id = str(uuid.uuid4())
                conn.execute(
                    text(
                        "INSERT INTO institutions (id, kind, name, lat, lng)"
                        " VALUES (:id, :kind, :name, 37.5, 127.0)"
                    ),
                    {"id": institution_id, "kind": role, "name": f"시험 {role}"},
                )
            conn.execute(
                text(
                    "INSERT INTO accounts (id, login_id, password_hash, role, institution_id)"
                    " VALUES (:id, :login_id, :hash, :role, :inst)"
                ),
                {
                    "id": account_id,
                    "login_id": login_id,
                    "hash": password_hash,
                    "role": role,
                    "inst": institution_id,
                },
            )
        created.append((account_id, institution_id))
        return login_id, account_id, institution_id

    yield make
    with sync_db.begin() as conn:
        for account_id, institution_id in created:
            conn.execute(text("DELETE FROM accounts WHERE id = :id"), {"id": account_id})
            if institution_id:
                conn.execute(
                    text("DELETE FROM institutions WHERE id = :id"), {"id": institution_id}
                )


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    with TestClient(create_app(Settings(enable_test_routes=False))) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_clock() -> Iterator[None]:
    clock.reset()
    yield
    clock.reset()


def login(client: TestClient, login_id: str, password: str = TEST_PASSWORD):
    client.cookies.clear()
    return client.post("/api/auth/login", json={"login_id": login_id, "password": password})
