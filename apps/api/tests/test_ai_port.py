"""BASE-01.6: complete_json picks the provider from LLM_PROVIDER, every failure is
LlmUnavailable, and the masking filter hides key and address values. No real Azure call:
the Azure SDK is pointed at nothing reachable or replaced."""

import asyncio
import logging
import tomllib
from pathlib import Path

import pytest

from app.ai import fake, port
from app.ai.azure import AzureProvider
from app.ai.port import LlmUnavailable, complete_json, resolve_provider_name
from app.core.config import Settings
from app.core.logging import MASK, MaskingFilter, mask

# Synthetic values only: shaped like the real settings, pointing at a reserved test domain.
FAKE_KEY = "unit-test-key-0123456789abcdef"
FAKE_BASE = "https://unit-test-resource.example.test/openai/v1/"
FAKE_ENDPOINT = "https://unit-test-resource.example.test/"
SCHEMA = {
    "type": "object",
    "properties": {
        "subjects": {"type": "array", "items": {"type": "string"}},
        "density": {"type": "string", "enum": ["tight", "normal"]},
        "budget": {"type": ["integer", "null"]},
    },
    "required": ["subjects", "density", "budget"],
    "additionalProperties": False,
}
MESSAGES = [{"role": "user", "content": "영어·수학"}]


def azure_settings(**overrides) -> Settings:
    values = dict(
        llm_provider="azure",
        azure_openai_api_key=FAKE_KEY,
        azure_openai_base_url=FAKE_BASE,
        azure_openai_endpoint=FAKE_ENDPOINT,
    )
    values.update(overrides)
    return Settings(**values)


def run(coro):
    return asyncio.run(coro)


@pytest.fixture(autouse=True)
def _fresh_fake():
    fake.provider.reset()
    yield
    fake.provider.reset()


def test_provider_selection() -> None:
    assert resolve_provider_name(Settings(llm_provider="fake")) == "fake"
    assert resolve_provider_name(Settings(llm_provider="none")) == "none"
    assert resolve_provider_name(azure_settings(llm_provider="auto")) == "azure"
    assert resolve_provider_name(Settings(llm_provider="auto", azure_openai_api_key="")) == "none"
    assert type(port.get_provider(azure_settings())).__name__ == "AzureProvider"
    assert type(port.get_provider(Settings(llm_provider="none"))).__name__ == "NoneProvider"
    assert port.get_provider(Settings(llm_provider="fake")) is fake.provider


def test_fake_fixed_response_passes_schema_and_records_request() -> None:
    fake.provider.configure("t", "fixed", {"subjects": ["영어"], "density": "tight", "budget": 1})
    result = run(complete_json("t", SCHEMA, MESSAGES, provider=fake.provider))
    assert result == {"subjects": ["영어"], "density": "tight", "budget": 1}
    assert fake.provider.requests == [{"task": "t", "messages": MESSAGES}]


@pytest.mark.parametrize(
    ("mode", "response"),
    [
        ("bad_json", None),
        ("error", None),
        ("fixed", {"subjects": ["영어"], "density": "loose", "budget": 1}),  # enum
        ("fixed", {"subjects": ["영어"], "density": "tight"}),  # missing
        ("fixed", {"subjects": ["영어"], "density": "tight", "budget": 1, "x": 1}),  # extra
        ("fixed", {"subjects": "영어", "density": "tight", "budget": 1}),  # type
        ("fixed", {"subjects": ["영어"], "density": "tight", "budget": True}),  # bool not int
    ],
)
def test_fake_failures_raise_llm_unavailable(mode, response) -> None:
    fake.provider.configure("t", mode, response)
    with pytest.raises(LlmUnavailable):
        run(complete_json("t", SCHEMA, MESSAGES, provider=fake.provider))


def test_unconfigured_task_and_none_provider_are_unavailable() -> None:
    with pytest.raises(LlmUnavailable):
        run(complete_json("unset", SCHEMA, MESSAGES, provider=fake.provider))
    with pytest.raises(LlmUnavailable):
        run(
            complete_json(
                "t", SCHEMA, MESSAGES, provider=port.get_provider(Settings(llm_provider="none"))
            )
        )


@pytest.mark.parametrize(
    "overrides",
    [
        {"azure_openai_api_key": ""},  # no key
        {"azure_openai_base_url": "http://unit-test-resource.example.test/openai/v1/"},
        {"azure_openai_endpoint": "http://unit-test-resource.example.test/"},
        {"azure_openai_base_url": "https://unit-test-resource.example.test/openai/"},
    ],
)
def test_azure_refuses_bad_configuration_without_calling(overrides, monkeypatch) -> None:
    def explode(*args, **kwargs):
        raise AssertionError("must not build a client")

    monkeypatch.setattr("app.ai.azure.AsyncOpenAI", explode)
    with pytest.raises(LlmUnavailable):
        run(
            complete_json(
                "t", SCHEMA, MESSAGES, provider=AzureProvider(azure_settings(**overrides))
            )
        )


def test_azure_errors_become_unavailable_without_the_message(monkeypatch) -> None:
    class Boom:
        def __init__(self, **kwargs):
            assert kwargs["timeout"] == 10.0 and kwargs["max_retries"] == 0
            assert kwargs["base_url"] == FAKE_BASE
            self.chat = self

        @property
        def completions(self):
            return self

        async def create(self, **kwargs):
            assert kwargs["response_format"]["json_schema"]["strict"] is True
            raise RuntimeError(f"401 for {FAKE_BASE} key {FAKE_KEY}")

        async def close(self):
            pass

    monkeypatch.setattr("app.ai.azure.AsyncOpenAI", Boom)
    with pytest.raises(LlmUnavailable) as caught:
        run(complete_json("t", SCHEMA, MESSAGES, provider=AzureProvider(azure_settings())))
    assert str(caught.value) == "provider_error"
    assert caught.value.__cause__ is None and caught.value.__suppress_context__


def test_masking_filter_hides_key_and_addresses() -> None:
    config = azure_settings()
    record = logging.LogRecord(
        "openai", logging.ERROR, __file__, 1, "call %s with %s failed", (FAKE_BASE, FAKE_KEY), None
    )
    try:
        raise RuntimeError(f"host unit-test-resource.example.test key={FAKE_KEY}")
    except RuntimeError:
        import sys

        record.exc_info = sys.exc_info()
    MaskingFilter(config).filter(record)
    rendered = record.getMessage() + (record.exc_text or "")
    for value in (FAKE_KEY, FAKE_BASE, "unit-test-resource.example.test"):
        assert value not in rendered
    assert MASK in rendered
    assert mask("nothing secret", config) == "nothing secret"


def test_openai_sdk_is_pinned() -> None:
    root = Path(__file__).resolve().parents[1]
    pyproject = tomllib.loads((root / "pyproject.toml").read_text())
    assert "openai==3.28.0" in pyproject["project"]["dependencies"]
    lock = tomllib.loads((root / "uv.lock").read_text())
    versions = {p["name"]: p["version"] for p in lock["package"]}
    assert versions["openai"] == "3.28.0"
