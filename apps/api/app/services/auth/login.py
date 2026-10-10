"""Login, lockout and logout (AD-8, AD-9). Writes `accounts` only."""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit, clock
from app.core import session as sessions
from app.core.errors import AppError
from app.models.auth import Account
from app.services.auth.passwords import verify_password

MAX_FAILURES = 5
LOCK_MINUTES = 15
# Verified when the login id is unknown, so the response time does not reveal it.
_DUMMY_HASH = "scrypt$16384$8$1$" + "00" * 16 + "$" + "00" * 32


async def login(db: AsyncSession, login_id: str, password: str) -> tuple[Account, str]:
    """Returns the account and a new session token, or raises 401."""
    account = await db.scalar(select(Account).where(Account.login_id == login_id))
    if account is None:
        verify_password(password, _DUMMY_HASH)
        await audit.record("login_failure", None, "/api/auth/login")
        raise AppError(401, "invalid_credentials")

    now = clock.now()
    if account.locked_until is not None and account.locked_until > now:
        await audit.record("login_failure", str(account.id), "/api/auth/login")
        raise AppError(401, "account_locked")

    if not verify_password(password, account.password_hash):
        account.failed_count = (account.failed_count or 0) + 1
        locked = account.failed_count >= MAX_FAILURES
        if locked:
            account.locked_until = now + timedelta(minutes=LOCK_MINUTES)
            account.failed_count = 0
        await db.commit()
        await audit.record("login_failure", str(account.id), "/api/auth/login")
        if locked:
            await audit.record("account_locked", str(account.id), "/api/auth/login")
        raise AppError(401, "invalid_credentials")

    account.failed_count = 0
    account.locked_until = None
    await db.commit()
    institution_id = str(account.institution_id) if account.institution_id else None
    info = await sessions.create(str(account.id), account.role, institution_id)
    await audit.record("login_success", str(account.id), "/api/auth/login")
    return account, info.token


async def logout(session: sessions.SessionInfo) -> None:
    await sessions.delete(session.token)
    await audit.record("logout", session.account_id, "/api/auth/logout")
