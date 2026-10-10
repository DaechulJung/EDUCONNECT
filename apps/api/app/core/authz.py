"""Session check and access denial (AD-8). Routers never raise 401/403/404 themselves.

@router.get("/children/{child_id}")
async def get_child(child_id: UUID, session: Parent) -> Child:
    child = ...  # query filtered by session.account_id
    if child is None:
        await deny_not_found(session, f"/api/children/{child_id}")
"""

from collections.abc import Awaitable, Callable
from typing import Annotated, NoReturn

from fastapi import Cookie, Depends, Request

from app.core import audit
from app.core.errors import AppError
from app.core.session import COOKIE_NAME, SessionInfo, load


async def current_session(
    ec_session: Annotated[str | None, Cookie(alias=COOKIE_NAME, include_in_schema=False)] = None,
) -> SessionInfo:
    """401 `unauthenticated` when the cookie is missing, unknown, logged out or expired."""
    session = await load(ec_session)
    if session is None:
        raise AppError(401, "unauthenticated")
    return session


def require_role(*roles: str) -> Callable[..., Awaitable[SessionInfo]]:
    """Dependency: 401 without a session, 403 (audited) when the role does not match."""

    async def dependency(
        request: Request, session: Annotated[SessionInfo, Depends(current_session)]
    ) -> SessionInfo:
        if roles and session.role not in roles:
            await audit.record("access_denied_403", session.account_id, request.url.path)
            raise AppError(403, "forbidden")
        return session

    return dependency


async def deny_not_found(session: SessionInfo, target: str) -> NoReturn:
    """Someone else's resource or a missing one: audit, then 404 without revealing which."""
    await audit.record("access_denied_404", session.account_id, target)
    raise AppError(404, "not_found")


AnyUser = Annotated[SessionInfo, Depends(require_role())]
Parent = Annotated[SessionInfo, Depends(require_role("parent"))]
AcademyStaff = Annotated[SessionInfo, Depends(require_role("academy"))]
SchoolStaff = Annotated[SessionInfo, Depends(require_role("school"))]
OrgStaff = Annotated[SessionInfo, Depends(require_role("academy", "school"))]
