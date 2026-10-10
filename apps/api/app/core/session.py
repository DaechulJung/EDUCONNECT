"""Session store in Redis (AD-8): `educonnect:session:<token>` -> account, TTL 8 hours, cookie
`ec_session`. Every key this app writes starts with REDIS_PREFIX (core/safety.py)."""

import json
import secrets
from dataclasses import asdict, dataclass

from app.core.redis import redis
from app.core.safety import REDIS_PREFIX

COOKIE_NAME = "ec_session"
SESSION_TTL_SECONDS = 8 * 60 * 60
SESSION_PREFIX = f"{REDIS_PREFIX}session:"


@dataclass(frozen=True)
class SessionInfo:
    token: str
    account_id: str
    role: str
    institution_id: str | None


def _key(token: str) -> str:
    return f"{SESSION_PREFIX}{token}"


async def create(account_id: str, role: str, institution_id: str | None) -> SessionInfo:
    info = SessionInfo(secrets.token_urlsafe(32), account_id, role, institution_id)
    value = {k: v for k, v in asdict(info).items() if k != "token"}
    await redis.set(_key(info.token), json.dumps(value), ex=SESSION_TTL_SECONDS)
    return info


async def load(token: str | None) -> SessionInfo | None:
    if not token:
        return None
    raw = await redis.get(_key(token))
    if raw is None:
        return None
    return SessionInfo(token=token, **json.loads(raw))


async def delete(token: str) -> None:
    await redis.delete(_key(token))
