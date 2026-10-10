"""Test double for Azure OpenAI (LLM_PROVIDER=fake, AD-11).

Tests set a mode per task through POST /api/test/llm and read the recorded request bodies
from GET /api/test/llm/requests. The fixed response content always comes from the test;
this module knows nothing about tasks.
"""

import json
from typing import Any, Literal

from app.ai.port import LlmUnavailable, Message

Mode = Literal["fixed", "bad_json", "error"]


class FakeProvider:
    name = "fake"

    def __init__(self) -> None:
        self.modes: dict[str, tuple[Mode, Any]] = {}
        self.requests: list[dict[str, Any]] = []

    def configure(self, task: str, mode: Mode, response: Any = None) -> None:
        self.modes[task] = (mode, response)

    def reset(self) -> None:
        self.modes.clear()
        self.requests.clear()

    async def complete(self, task: str, schema: dict[str, Any], messages: list[Message]) -> str:
        self.requests.append({"task": task, "messages": messages})
        mode, response = self.modes.get(task, ("error", None))
        if mode == "fixed":
            return response if isinstance(response, str) else json.dumps(response)
        if mode == "bad_json":
            return '{"not": "the schema"'
        raise LlmUnavailable("fake_error")


provider = FakeProvider()
