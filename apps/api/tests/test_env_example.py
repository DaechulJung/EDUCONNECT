"""TC-59 (AC-10.3): `.env.example` names the five Azure OpenAI variables with empty values, and
CI runs on the LLM double: no job gets an Azure key, the e2e job sets LLM_PROVIDER=fake, and the
api job has no Azure variable at all, so `auto` resolves to the fallback provider.
(The CI run record itself is checked on the PR: see docs/e2e-test.md TC-59.)"""

import re
from pathlib import Path

from app.ai.port import resolve_provider_name
from app.core.config import Settings

ROOT = Path(__file__).resolve().parents[3]
AZURE = [
    "AZURE_OPENAI_LOCATION",
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_BASE_URL",
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_DEPLOYMENT",
]
CI = (ROOT / ".github" / "workflows" / "ci.yml").read_text()


def assignments(path: Path) -> list[tuple[str, str]]:
    pairs = []
    for line in path.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith("#"):
            name, _, value = line.partition("=")
            pairs.append((name.strip(), value))
    return pairs


def test_env_example_lists_the_five_azure_names_with_empty_values() -> None:
    pairs = assignments(ROOT / ".env.example")
    azure = [(name, value) for name, value in pairs if name.startswith("AZURE_OPENAI_")]
    assert [name for name, _ in azure] == AZURE  # each once, nothing else Azure-named
    assert all(value == "" for _, value in azure), [n for n, v in azure if v != ""]


def job(name: str) -> str:
    match = re.search(rf"^  {name}:\n((?:    .*\n|\s*\n)+)", CI, re.MULTILINE)
    assert match, f"CI job {name}"
    return match.group(1)


def test_ci_uses_the_llm_double_and_never_gets_an_azure_key() -> None:
    assert re.search(r"^\s+LLM_PROVIDER: fake\b", job("e2e"), re.MULTILINE)
    assert "AZURE_OPENAI_API_KEY" not in CI
    assert "AZURE_OPENAI_BASE_URL" not in CI
    assert not re.search(r"secrets\.\w*AZURE", CI, re.IGNORECASE)
    assert "AZURE_OPENAI" not in job("api")


def test_ci_api_job_settings_resolve_to_no_azure_call() -> None:
    # The api job's environment: no Azure variable, LLM_PROVIDER unset (auto).
    blank = {"azure_openai_api_key": "", "azure_openai_base_url": "", "azure_openai_endpoint": ""}
    config = Settings(_env_file=None, llm_provider="auto", **blank)
    assert resolve_provider_name(config) == "none"
    # Even with the e2e job's synthetic endpoint, no key means no Azure provider.
    blank["azure_openai_endpoint"] = "https://synthetic-test-endpoint.invalid/"
    config = Settings(_env_file=None, llm_provider="auto", **blank)
    assert resolve_provider_name(config) == "none"
