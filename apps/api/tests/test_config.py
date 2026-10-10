"""BASE-01.9: DB_PORT and REDIS_PORT move the app's own addresses together with the compose ports,
so a worktree on other ports never reaches another project's database (PR #15 review)."""

import pytest

from app.core.config import Settings

NAMES = [
    "DATABASE_URL",
    "REDIS_URL",
    "DB_PORT",
    "REDIS_PORT",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
]


@pytest.fixture
def clean_env(monkeypatch: pytest.MonkeyPatch) -> pytest.MonkeyPatch:
    for name in NAMES:
        monkeypatch.delenv(name, raising=False)
    return monkeypatch


def test_defaults_match_npm_run_infra(clean_env: pytest.MonkeyPatch) -> None:
    s = Settings(_env_file=None)
    assert s.database_url == "postgresql+psycopg://educonnect:educonnect@localhost:15432/educonnect"
    assert s.redis_url == "redis://localhost:16379/0"


def test_ports_and_postgres_names_build_the_addresses(clean_env: pytest.MonkeyPatch) -> None:
    clean_env.setenv("DB_PORT", "25433")
    clean_env.setenv("REDIS_PORT", "26380")
    clean_env.setenv("POSTGRES_USER", "u1")
    clean_env.setenv("POSTGRES_PASSWORD", "p1")
    clean_env.setenv("POSTGRES_DB", "d1")
    s = Settings(_env_file=None)
    assert s.database_url == "postgresql+psycopg://u1:p1@localhost:25433/d1"
    assert s.redis_url == "redis://localhost:26380/0"


def test_explicit_urls_win_over_ports(clean_env: pytest.MonkeyPatch) -> None:
    clean_env.setenv("DB_PORT", "25433")
    clean_env.setenv("REDIS_PORT", "26380")
    clean_env.setenv(
        "DATABASE_URL", "postgresql+psycopg://educonnect:educonnect@db:5432/educonnect"
    )
    clean_env.setenv("REDIS_URL", "redis://redis:6379/0")
    s = Settings(_env_file=None)
    assert s.database_url == "postgresql+psycopg://educonnect:educonnect@db:5432/educonnect"
    assert s.redis_url == "redis://redis:6379/0"


def test_empty_strings_from_compose_fall_back_to_defaults(clean_env: pytest.MonkeyPatch) -> None:
    # compose.yml passes `${NAME:-}`, so an unset variable arrives as "" (#14 follow-up)
    for name in ["LLM_PROVIDER", "ENABLE_TEST_ROUTES", "AZURE_OPENAI_DEPLOYMENT"]:
        clean_env.setenv(name, "")
    s = Settings(_env_file=None)
    assert s.llm_provider == "auto"
    assert s.enable_test_routes is False
    assert s.azure_openai_deployment == "gpt-5.4-mini"
