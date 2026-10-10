"""Azure OpenAI through the openai SDK v1 surface (AD-10).

base_url is https and ends with /openai/v1/; structured output uses a strict json_schema.
Timeout 10 s, no retries, so the fallback answers quickly.
"""

from typing import Any

from openai import AsyncOpenAI

from app.ai.port import LlmUnavailable, Message, azure_config_error
from app.core.config import Settings

TIMEOUT_SECONDS = 10.0


class AzureProvider:
    name = "azure"

    def __init__(self, config: Settings):
        self.config = config

    async def complete(self, task: str, schema: dict[str, Any], messages: list[Message]) -> str:
        if azure_config_error(self.config) is not None:
            raise LlmUnavailable("config")
        client = AsyncOpenAI(
            base_url=self.config.azure_openai_base_url,
            api_key=self.config.azure_openai_api_key,
            timeout=TIMEOUT_SECONDS,
            max_retries=0,
        )
        try:
            response = await client.chat.completions.create(
                model=self.config.azure_openai_deployment,
                messages=messages,  # type: ignore[arg-type]
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": task, "schema": schema, "strict": True},
                },
            )
        finally:
            await client.close()
        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise LlmUnavailable("empty")
        return content
