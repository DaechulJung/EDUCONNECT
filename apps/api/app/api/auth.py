from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authz import AnyUser
from app.core.db import get_session
from app.core.errors import error_responses
from app.core.session import COOKIE_NAME, SESSION_TTL_SECONDS
from app.models.auth import Account
from app.schemas.auth import LoginRequest, Me
from app.services.auth import login as auth

router = APIRouter(prefix="/auth", tags=["auth"])
Db = Annotated[AsyncSession, Depends(get_session)]


def _me(account_id: str, login_id: str, role: str, institution_id: str | None) -> Me:
    return Me(account_id=account_id, login_id=login_id, role=role, institution_id=institution_id)


@router.post("/login", responses=error_responses(401))
async def login(body: LoginRequest, response: Response, db: Db) -> Me:
    account, token = await auth.login(db, body.login_id, body.password)
    # Local http demo, so Secure is off (AD-8); loopback only (AD-12).
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=SESSION_TTL_SECONDS,
        path="/",
        httponly=True,
        samesite="lax",
    )
    institution_id = str(account.institution_id) if account.institution_id else None
    return _me(str(account.id), account.login_id, account.role, institution_id)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, responses=error_responses(401))
async def logout(session: AnyUser, response: Response) -> None:
    await auth.logout(session)
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True, samesite="lax")


@router.get("/me", responses=error_responses(401))
async def me(session: AnyUser, db: Db) -> Me:
    login_id = await db.scalar(select(Account.login_id).where(Account.id == session.account_id))
    return _me(session.account_id, login_id or "", session.role, session.institution_id)
