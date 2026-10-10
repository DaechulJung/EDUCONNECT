"""Guards for destructive work (PR #15 review): seed reset, /api/test/reset, test fixtures.

On this machine another scaffold project publishes the same default ports, so a missing variable
can point the app at someone else's database or Redis. Before clearing anything the connected
database name must be EDUCONNECT's own; Redis deletes stay inside REDIS_PREFIX.
"""

from sqlalchemy import Connection, text
from sqlalchemy.ext.asyncio import AsyncSession

REDIS_PREFIX = "educonnect:"
_CURRENT = text("SELECT current_database()")


class ForeignDatabase(RuntimeError):
    """Connected to a database that is not EDUCONNECT's; nothing was changed."""


def is_own_database(name: str) -> bool:
    """`educonnect`, or a per-worktree copy such as `educonnect_dev1`."""
    return name == "educonnect" or name.startswith("educonnect_")


def _check(name: str) -> None:
    if not is_own_database(name):
        raise ForeignDatabase(
            f"refusing to clear database {name!r}: not an EDUCONNECT database "
            "(check DATABASE_URL / DB_PORT / POSTGRES_DB)"
        )


async def assert_own_database(db: AsyncSession) -> None:
    _check((await db.execute(_CURRENT)).scalar_one())


def assert_own_database_sync(conn: Connection) -> None:
    _check(conn.execute(_CURRENT).scalar_one())
