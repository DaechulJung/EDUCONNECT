"""No LLM: every call goes to the caller's fallback path (no key, or LLM_PROVIDER=none)."""

from typing import Any

from app.ai.port import LlmUnavailable, Message


class NoneProvider:
    name = "none"

    async def complete(self, task: str, schema: dict[str, Any], messages: list[Message]) -> str:
        raise LlmUnavailable("disabled")
