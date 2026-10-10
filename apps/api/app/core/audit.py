"""Audit events (AD-9, SEC-10). The only writer of `audit_events`.

target holds a path and resource id only: never request bodies, cookies, headers,
passwords or AZURE_OPENAI_* values.
"""

from typing import Literal

from app.core import clock
from app.core.db import SessionLocal
from app.models.auth import AuditEvent

AuditKind = Literal[
    "login_success",
    "login_failure",
    "account_locked",
    "logout",
    "access_denied_404",
    "access_denied_403",
]


async def record(kind: AuditKind, account_id: str | None, target: str) -> None:
    # Own transaction, so a denial is kept even when the caller's work rolls back.
    async with SessionLocal() as db, db.begin():
        db.add(AuditEvent(at=clock.now(), kind=kind, account_id=account_id, target=target[:300]))
