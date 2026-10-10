"""chat routes: one chat turn and the per-child conditions. 501 until #5 (AD-3)."""

from fastapi import APIRouter

from app.core.authz import Parent
from app.core.errors import error_responses, not_implemented
from app.schemas.chat import ChatMessageIn, ChatReply, Conditions, ConditionsIn

router = APIRouter(tags=["chat"])
OWNED = error_responses(401, 403, 404, 501)


@router.post("/chat/messages", responses=OWNED)
async def send_chat_message(body: ChatMessageIn, session: Parent) -> ChatReply:
    raise not_implemented()


@router.get("/children/{child_id}/conditions", responses=OWNED)
async def get_conditions(child_id: str, session: Parent) -> Conditions | None:
    raise not_implemented()


@router.put("/children/{child_id}/conditions", responses=OWNED)
async def save_conditions(child_id: str, body: ConditionsIn, session: Parent) -> Conditions:
    raise not_implemented()
