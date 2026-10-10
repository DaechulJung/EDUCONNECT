"""chat routes: one chat turn and the per-child conditions (REQ-05)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authz import Parent, deny_not_found
from app.core.db import get_session
from app.core.errors import error_responses
from app.schemas.chat import ChatMessageIn, ChatReply, Conditions, ConditionsIn
from app.services.chat import conditions
from app.services.chat.conditions import NotOwned

router = APIRouter(tags=["chat"])
OWNED = error_responses(401, 403, 404, 422)
Db = Annotated[AsyncSession, Depends(get_session)]


@router.post("/chat/messages", responses=OWNED)
async def send_chat_message(body: ChatMessageIn, session: Parent, db: Db) -> ChatReply:
    try:
        return await conditions.chat_turn(db, session.account_id, body.child_id, body.text)
    except NotOwned:
        await deny_not_found(session, "/api/chat/messages")


@router.get("/children/{child_id}/conditions", responses=OWNED)
async def get_conditions(child_id: str, session: Parent, db: Db) -> Conditions | None:
    try:
        return await conditions.get(db, session.account_id, child_id)
    except NotOwned:
        await deny_not_found(session, f"/api/children/{child_id}/conditions")


@router.put("/children/{child_id}/conditions", responses=OWNED)
async def save_conditions(child_id: str, body: ConditionsIn, session: Parent, db: Db) -> Conditions:
    try:
        return await conditions.save(db, session.account_id, child_id, body)
    except NotOwned:
        await deny_not_found(session, f"/api/children/{child_id}/conditions")
