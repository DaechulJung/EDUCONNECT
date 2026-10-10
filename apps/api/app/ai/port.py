"""The only way to call an LLM (AD-10): `await complete_json(task, schema, messages)`.

Every failure (no key, non-https or wrong base URL, provider error, 10 s timeout, invalid
JSON, schema mismatch) raises `LlmUnavailable`; the calling module switches to its own
fallback (rule extraction, template text). Prompts, schemas and task names belong to
the calling module (chat, planner). Schemas use the Azure strict subset: every property
required, `additionalProperties: false`, no length or range keywords (re-check ranges
with Pydantic).
"""

import json
from typing import Any, Literal, Protocol

from app.core.config import Settings, settings

Message = dict[str, str]  # {"role": "system" | "user", "content": "..."}


class LlmUnavailable(Exception):
    """The reason is a fixed code (never a provider message, which may contain secrets)."""


class Provider(Protocol):
    name: str

    async def complete(self, task: str, schema: dict[str, Any], messages: list[Message]) -> str: ...


def azure_config_error(config: Settings) -> str | None:
    """Why Azure must not be called, or None. Messages never include values (AC-10.5)."""
    if not (config.azure_openai_api_key and config.azure_openai_base_url):
        return "missing"
    for url in (config.azure_openai_endpoint, config.azure_openai_base_url):
        if url and not url.startswith("https://"):
            return "https 필요"
    if not config.azure_openai_base_url.endswith("/openai/v1/"):
        return "base URL은 /openai/v1/로 끝나야 함"
    return None


def resolve_provider_name(
    config: Settings = settings,
) -> Literal["azure", "fake", "none"]:
    if config.llm_provider == "auto":
        return "azure" if azure_config_error(config) is None else "none"
    return config.llm_provider


def get_provider(config: Settings = settings) -> Provider:
    name = resolve_provider_name(config)
    if name == "azure":
        from app.ai.azure import AzureProvider

        return AzureProvider(config)
    if name == "fake":
        from app.ai import fake

        return fake.provider
    from app.ai.none import NoneProvider

    return NoneProvider()


async def complete_json(
    task: str,
    schema: dict[str, Any],
    messages: list[Message],
    *,
    provider: Provider | None = None,
) -> dict[str, Any]:
    provider = provider or get_provider()
    try:
        text = await provider.complete(task, schema, messages)
    except LlmUnavailable:
        raise
    except Exception:  # provider errors may carry URLs or keys: drop the message and cause
        raise LlmUnavailable("provider_error") from None
    try:
        value = json.loads(text)
    except TypeError, ValueError:
        raise LlmUnavailable("invalid_json") from None
    problem = schema_mismatch(value, schema)
    if problem is not None:
        raise LlmUnavailable("schema_mismatch")
    return value


_JSON_TYPES: dict[str, tuple[type, ...]] = {
    "object": (dict,),
    "array": (list,),
    "string": (str,),
    "integer": (int,),
    "number": (int, float),
    "boolean": (bool,),
    "null": (type(None),),
}


def schema_mismatch(value: Any, schema: dict[str, Any], path: str = "$") -> str | None:
    """Check the strict-subset keywords: type, enum, properties, required,
    additionalProperties, items, anyOf. Returns where it differs, or None."""
    if "anyOf" in schema:
        if all(schema_mismatch(value, option, path) for option in schema["anyOf"]):
            return f"{path}: no anyOf option"
        return None
    if "enum" in schema and value not in schema["enum"]:
        return f"{path}: not in enum"
    types = schema.get("type")
    if types is not None:
        allowed = [types] if isinstance(types, str) else list(types)
        ok = any(
            isinstance(value, _JSON_TYPES[t])
            and not (t in ("integer", "number") and isinstance(value, bool))
            for t in allowed
        )
        if not ok:
            return f"{path}: not {allowed}"
    if isinstance(value, dict):
        properties = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                return f"{path}.{key}: missing"
        if schema.get("additionalProperties") is False:
            extra = set(value) - set(properties)
            if extra:
                return f"{path}: extra {sorted(extra)}"
        for key, sub in properties.items():
            if key in value:
                problem = schema_mismatch(value[key], sub, f"{path}.{key}")
                if problem:
                    return problem
    if isinstance(value, list) and "items" in schema:
        for index, item in enumerate(value):
            problem = schema_mismatch(item, schema["items"], f"{path}[{index}]")
            if problem:
                return problem
    return None
