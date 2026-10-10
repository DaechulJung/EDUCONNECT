"""BASE-01.7 / BASE-01.9 (PR #15 review): seed reset (/api/test/reset) and the test fixtures refuse
a database that is not EDUCONNECT's and change nothing there; Redis deletes stay in our prefix.

The "other project" is a throwaway database created inside EDUCONNECT's own container.
"""

import asyncio

import pytest
from redis import Redis
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings
from app.core.safety import ForeignDatabase, assert_own_database_sync, is_own_database
from app.core.session import SESSION_PREFIX
from app.seed import load

OTHER_DB = "other_project_safety"


@pytest.fixture
def other_db(sync_db):
    admin = sync_db.execution_options(isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {OTHER_DB}"))
        conn.execute(text(f"CREATE DATABASE {OTHER_DB}"))
    url = make_url(settings.database_url).set(database=OTHER_DB)
    engine = create_engine(url)
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE accounts (id int)"))
        conn.execute(text("INSERT INTO accounts VALUES (1), (2)"))
    yield url, engine
    engine.dispose()
    with admin.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {OTHER_DB} WITH (FORCE)"))


def test_own_database_names() -> None:
    assert is_own_database("educonnect")
    assert is_own_database("educonnect_dev1")
    for name in ["app", "resident_parking", "educonnectx", OTHER_DB]:
        assert not is_own_database(name), name


def test_reset_and_fixture_guard_refuse_another_database(other_db) -> None:
    url, engine = other_db
    r = Redis.from_url(settings.redis_url, decode_responses=True)
    ours, theirs = f"{SESSION_PREFIX}safety-probe", "session:safety-probe"
    r.set(ours, "1", ex=60)
    r.set(theirs, "1", ex=60)

    async def reset_there() -> None:
        aengine = create_async_engine(url)
        try:
            async with AsyncSession(aengine) as db:
                await load.reset(db)
        finally:
            await aengine.dispose()

    try:
        with pytest.raises(ForeignDatabase):
            asyncio.run(reset_there())
        with engine.connect() as conn, pytest.raises(ForeignDatabase):
            assert_own_database_sync(conn)

        with engine.connect() as conn:
            assert conn.execute(text("SELECT count(*) FROM accounts")).scalar_one() == 2
        assert r.get(ours) == "1" and r.get(theirs) == "1"  # refused before any Redis delete
    finally:
        r.delete(ours, theirs)
        r.close()


def test_reset_deletes_only_prefixed_keys(sync_db, monkeypatch: pytest.MonkeyPatch) -> None:
    r = Redis.from_url(settings.redis_url, decode_responses=True)
    ours, theirs = f"{SESSION_PREFIX}safety-probe-2", "session:safety-probe-2"
    r.set(ours, "1", ex=60)
    r.set(theirs, "1", ex=60)

    async def reset_here() -> None:
        # a client for this loop only: the app's shared client stays bound to the TestClient loop
        monkeypatch.setattr(load, "redis", AsyncRedis.from_url(settings.redis_url))
        aengine = create_async_engine(settings.database_url)
        try:
            async with AsyncSession(aengine) as db:
                await load.clear(db)
                await db.rollback()  # keep this test's DB untouched; only the Redis scope matters
        finally:
            await aengine.dispose()
            await load.redis.aclose()

    try:
        asyncio.run(reset_here())
        assert r.get(ours) is None
        assert r.get(theirs) == "1"
    finally:
        r.delete(ours, theirs)
        r.close()
