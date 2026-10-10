"""BASE-01.9: compose ports are 127.0.0.1-only with *_PORT variables, the api service passes
the LLM/test/seed variables as ${NAME:-}, and .env.example lists names without values.
(TC-77's running-state check with `docker compose ps` belongs to #10.)"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMPOSE = (ROOT / "compose.yml").read_text()
EXPECTED_PORTS = {
    "db": "127.0.0.1:${DB_PORT:-15432}:5432",
    "redis": "127.0.0.1:${REDIS_PORT:-16379}:6379",
    "api": "127.0.0.1:${API_PORT:-8000}:8000",
    "web": "127.0.0.1:${WEB_PORT:-3000}:3000",
}
PASSED = [
    "AZURE_OPENAI_LOCATION",
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_BASE_URL",
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_DEPLOYMENT",
    "LLM_PROVIDER",
    "ENABLE_TEST_ROUTES",
    "SEED_PASSWORD",
]


def service_block(name: str) -> str:
    match = re.search(rf"^  {name}:\n((?:    .*\n|\s*\n)+)", COMPOSE, re.MULTILINE)
    assert match, name
    return match.group(1)


def test_every_published_port_is_loopback_with_a_variable() -> None:
    for service, expected in EXPECTED_PORTS.items():
        ports = re.findall(r"ports:\s*\[(.*?)\]", service_block(service))
        assert ports == [f'"{expected}"'], (service, ports)
    every = re.findall(r"ports:\s*\[(.*?)\]", COMPOSE)
    assert len(every) == 4 and all(p.startswith('"127.0.0.1:') for p in every)


def test_api_passes_variables_through_without_values() -> None:
    api = service_block("api")
    for name in PASSED:
        assert re.search(rf"^\s+{name}: \$\{{{name}:-\}}$", api, re.MULTILINE), name


def test_env_example_has_names_only() -> None:
    lines = (ROOT / ".env.example").read_text().splitlines()
    assignments = dict(line.split("=", 1) for line in lines if line and not line.startswith("#"))
    for name in [*PASSED, "WEB_PORT", "API_PORT"]:
        assert name in assignments, name
    for name in PASSED:
        assert assignments[name] == "", name
