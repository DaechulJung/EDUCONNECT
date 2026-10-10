"""REQ-12 service meta (AC-12.1·12.2 API half; the screen half is tests/branding.e2e.ts TC-67·68).

The app is built after the synthetic Azure values are set, so a response that read any setting
would carry the host (the TC-76 review: values injected after the app exists prove little).
"""

from urllib.parse import urlparse

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

SYNTHETIC_ENDPOINT = "https://educonnect-synthetic-meta.openai.azure.com/"


def test_meta_returns_fixed_labels_without_endpoint_host(monkeypatch) -> None:
    monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", SYNTHETIC_ENDPOINT)
    monkeypatch.setenv("AZURE_OPENAI_BASE_URL", SYNTHETIC_ENDPOINT + "openai/v1/")
    monkeypatch.setenv("AZURE_OPENAI_LOCATION", "koreacentral")
    config = Settings()
    assert config.azure_openai_endpoint == SYNTHETIC_ENDPOINT  # the app really has the value

    # No session: the header slot loads for every visitor (arch API table, "모두").
    with TestClient(create_app(config)) as client:
        response = client.get("/api/meta")

    assert response.status_code == 200
    assert response.json() == {
        "service_name": "EDUCONNECT",
        "subtitle": "모두의 AI 교육 에이전트",
        "modu_ai_status": "mock",
        "ai_provider_label": "Azure OpenAI(국내 리전)",
    }
    host = urlparse(SYNTHETIC_ENDPOINT).hostname
    assert host and host not in response.text
    assert "koreacentral" not in response.text
