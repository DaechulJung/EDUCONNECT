"""TC-58 (AC-10.2) and TC-61 (AC-10.5): Azure OpenAI values stay out of responses and logs.

Synthetic values only, put in the environment *before* Settings and the app are created, so the
startup log, the masking filter and the provider all see the same configuration the way a real
server would (the TC-76 weakness was patching values in after the app existed).

The Azure double works at the HTTP level: the real openai SDK client talks to an
httpx.MockTransport that answers 401 (echoing the key and URL back, the worst case) or times out.

Logs are read by a raw handler that refuses the masking filter, like a server whose root logger
had no handler when the filter was installed: only masking done by the app itself counts.
"""

import logging
from collections.abc import Iterator
from contextlib import contextmanager

import httpx2 as httpx  # what openai 3.x and starlette.testclient use
import openai
import pytest
from fastapi.testclient import TestClient

from app.core import config as config_module
from app.core.config import Settings
from app.core.logging import MASK
from app.main import create_app
from tests.conftest import login

SYN_KEY = "test-key-not-real-0123456789abcdef"
SYN_HOST = "synthetic-test-endpoint.invalid"
SYN_ENDPOINT = f"https://{SYN_HOST}/"
SYN_BASE = f"https://{SYN_HOST}/openai/v1/"
ENV_NAMES = (
    "LLM_PROVIDER",
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_BASE_URL",
)
SECRETS = (SYN_KEY, SYN_ENDPOINT, SYN_BASE.rstrip("/"), SYN_HOST)
TEXT = "초5 아이 영어·수학 위주로 월 100만원 전후로 촘촘하게"
HTTPS_ERROR = "Azure OpenAI 설정 오류: https 필요"


class RawCapture(logging.Handler):
    """Keeps every record as rendered text; never accepts a filter."""

    def __init__(self) -> None:
        super().__init__(logging.DEBUG)
        self.lines: list[str] = []
        self.messages: list[str] = []

    def addFilter(self, filter) -> None:  # noqa: N802, A002 - logging API name
        pass

    def emit(self, record: logging.LogRecord) -> None:
        message = record.getMessage()
        self.messages.append(message)
        self.lines.append(f"{record.name} {message} {record.exc_text or ''}")

    @property
    def text(self) -> str:
        return "\n".join(self.lines)


@contextmanager
def raw_logs() -> Iterator[RawCapture]:
    root = logging.getLogger()
    capture, level = RawCapture(), root.level
    root.addHandler(capture)
    root.setLevel(logging.DEBUG)
    try:
        yield capture
    finally:
        root.removeHandler(capture)
        root.setLevel(level)


class AzureDouble:
    """Stands in for the Azure endpoint behind the real SDK client."""

    def __init__(self, mode: str) -> None:
        self.mode = mode
        self.calls = 0

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.calls += 1
        if self.mode == "timeout":
            raise httpx.ReadTimeout(f"timed out reading {request.url}", request=request)
        message = f"Access denied: key {SYN_KEY} is not valid for {request.url}"
        return httpx.Response(401, json={"error": {"code": "401", "message": message}})


@pytest.fixture
def azure_env(monkeypatch: pytest.MonkeyPatch):
    """Put synthetic Azure values in the environment, then build Settings and the app."""

    def build(provider: str, endpoint: str, base_url: str) -> TestClient:
        # Names zipped with values, so no line here reads as a NAME=value assignment (TC-62).
        values = (provider, SYN_KEY, endpoint, base_url)
        for name, value in zip(ENV_NAMES, values, strict=True):
            monkeypatch.setenv(name, value)
        loaded = Settings()  # read from the environment, after the values are there
        # One server = one configuration: the app modules hold the process-wide `settings` object
        # (bound as default arguments at import), so that same object takes every loaded value
        # before the app is created. Nothing is patched in after startup.
        config = config_module.settings
        for field in Settings.model_fields:
            monkeypatch.setattr(config, field, getattr(loaded, field))
        return TestClient(create_app(config))

    return build


@pytest.fixture
def azure_double(monkeypatch: pytest.MonkeyPatch):
    def install(mode: str) -> AzureDouble:
        double = AzureDouble(mode)
        real = openai.AsyncOpenAI

        def client(**kwargs):
            transport = httpx.MockTransport(double)
            return real(**kwargs, http_client=httpx.AsyncClient(transport=transport))

        monkeypatch.setattr("app.ai.azure.AsyncOpenAI", client)
        return double

    return install


def chat(client: TestClient, make_account, make_child) -> httpx.Response:
    login_id, account_id, _ = make_account("parent")
    child_id = make_child(account_id)
    assert login(client, login_id).status_code == 200
    return client.post("/api/chat/messages", json={"child_id": child_id, "text": TEXT})


def assert_no_secret(text: str, where: str) -> None:
    for value in SECRETS:
        assert value not in text, f"synthetic Azure value in {where}"


# --- TC-58 (AC-10.2) -----------------------------------------------------------------------


@pytest.mark.parametrize("mode", ["unauthorized", "timeout"])
def test_azure_failure_leaves_no_value_in_response_or_logs(
    mode, azure_env, azure_double, make_account, make_child
) -> None:
    double = azure_double(mode)
    with raw_logs() as logs:
        with azure_env("azure", SYN_ENDPOINT, SYN_BASE) as client:
            response = chat(client, make_account, make_child)

    assert double.calls == 1, "the request reached the Azure double"
    assert response.status_code == 200
    assert response.json()["source"] == "fallback"
    assert_no_secret(response.text, "the API response")
    assert_no_secret(logs.text, "the server log")
    failures = [m for m in logs.messages if m.startswith("Azure OpenAI 호출 실패")]
    assert failures and all(MASK in m for m in failures), "a masked failure line"


# --- TC-61 (AC-10.5) -----------------------------------------------------------------------

PLAIN = f"http://{SYN_HOST}"


@pytest.mark.parametrize("provider", ["auto", "azure"])
@pytest.mark.parametrize(
    ("endpoint", "base_url"),
    [(f"{PLAIN}/", SYN_BASE), (SYN_ENDPOINT, f"{PLAIN}/openai/v1/")],
    ids=["endpoint-http", "base-url-http"],
)
def test_non_https_setting_never_calls_azure_and_logs_without_values(
    provider, endpoint, base_url, azure_env, azure_double, make_account, make_child
) -> None:
    double = azure_double("unauthorized")
    with raw_logs() as logs:
        with azure_env(provider, endpoint, base_url) as client:
            startup = list(logs.messages)
            response = chat(client, make_account, make_child)

    assert HTTPS_ERROR in startup, "startup log line"
    assert double.calls == 0, "Azure was called"
    assert response.status_code == 200
    assert response.json()["source"] == "fallback"
    assert_no_secret(response.text, "the API response")
    assert_no_secret(logs.text.replace(PLAIN, ""), "the server log")
    assert PLAIN not in logs.text, "plain-http address in the server log"


def test_https_settings_do_reach_azure(azure_env, azure_double, make_account, make_child) -> None:
    """Control for TC-61: the same setup with https values does call the double."""
    double = azure_double("unauthorized")
    with raw_logs() as logs:
        with azure_env("auto", SYN_ENDPOINT, SYN_BASE) as client:
            chat(client, make_account, make_child)
    assert double.calls == 1
    assert HTTPS_ERROR not in logs.messages
