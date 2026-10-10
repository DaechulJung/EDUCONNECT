"""Path ids. A malformed id is just another resource the caller cannot see: 404, never 422."""

import uuid

from app.core.authz import deny_not_found
from app.core.session import SessionInfo


async def parse_owned_id(session: SessionInfo, value: str, target: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        await deny_not_found(session, target)
