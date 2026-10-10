"""TC-77 (AC-10.7): every port compose.yml publishes binds to 127.0.0.1 only.

1) File: each `ports` entry of web, api, db and redis starts with "127.0.0.1:".
2) Running state: after `docker compose up --wait`, every published address in
   `docker compose ps --format json` is 127.0.0.1 (no 0.0.0.0, no ::).

The running-state half starts the whole app, so it carries the `compose_runtime` marker and the
default `pytest` run (npm run check, CI api job) deselects it. Run it on purpose with
`uv run --directory apps/api pytest -m compose_runtime tests/test_compose_ports.py`
(CI does this in the e2e job after `docker compose up`). Once selected it never skips: no docker,
no running app or no published port is a failure. `docker compose config` and `docker inspect`
are not used (AD-10: they would print the Azure values).
"""

import json
import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
SERVICES = ("web", "api", "db", "redis")


def ports_entries(compose: str, service: str) -> list[str]:
    block = re.search(rf"^  {service}:\n((?:    .*\n|\s*\n)+)", compose, re.MULTILINE)
    assert block, f"service {service} in compose.yml"
    found: list[str] = []
    for inline in re.findall(r"^\s+ports:\s*\[(.*?)\]", block.group(1), re.MULTILINE):
        found += [p.strip().strip("\"'") for p in inline.split(",") if p.strip()]
    for listed in re.findall(r"^\s+ports:\s*\n((?:\s+-\s.*\n)+)", block.group(1), re.MULTILINE):
        found += [line.split("-", 1)[1].strip().strip("\"'") for line in listed.splitlines()]
    return found


def test_every_ports_entry_starts_with_loopback() -> None:
    compose = (ROOT / "compose.yml").read_text()
    for service in SERVICES:
        entries = ports_entries(compose, service)
        assert entries, f"{service} publishes a port"
        for entry in entries:
            assert entry.startswith("127.0.0.1:"), (service, entry)


def test_ports_entries_parser_sees_both_styles() -> None:
    compose = (
        "services:\n"
        "  web:\n"
        '    ports: ["0.0.0.0:3000:3000"]\n'
        "  api:\n"
        "    ports:\n"
        '      - "8000:8000"\n'
    )
    assert ports_entries(compose, "web") == ["0.0.0.0:3000:3000"]
    assert ports_entries(compose, "api") == ["8000:8000"]


def compose(*args: str) -> str:
    done = subprocess.run(
        ["docker", "compose", *args], cwd=ROOT, capture_output=True, text=True, timeout=900
    )
    assert done.returncode == 0, f"docker compose {args[0]} failed:\n{done.stderr[-2000:]}"
    return done.stdout


def parse_ps(text: str) -> list[dict]:
    """`docker compose ps --format json` is one JSON array (older) or one object per line."""
    text = text.strip()
    if text.startswith("["):
        return json.loads(text)
    return [json.loads(line) for line in text.splitlines() if line.strip()]


@pytest.mark.compose_runtime
def test_running_containers_publish_on_loopback_only() -> None:
    compose("up", "--wait")
    containers = parse_ps(compose("ps", "--format", "json"))
    published: dict[str, list[str]] = {}
    for container in containers:
        for p in container.get("Publishers") or []:
            if p.get("PublishedPort"):
                published.setdefault(container["Service"], []).append(p.get("URL", ""))
    assert sorted(published) == sorted(SERVICES), published
    for service, urls in published.items():
        assert urls and all(url == "127.0.0.1" for url in urls), (service, urls)
