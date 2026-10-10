"""TC-62 (AC-10.6): no tracked file holds an Azure OpenAI secret assignment or endpoint host.

The patterns live here only (AC-10.6: never in the docs). Matches are reported as file:line,
never with the matched text, so a failing run does not print a secret either.
Test values are allowed only when they say so: the value or host label contains "synthetic",
"fake" or "unit-test", or uses a reserved test domain (.invalid, .example, .test), as in
TC-68, TC-76 and the CI e2e job.
"""

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
NAMES = "LOCATION|ENDPOINT|BASE_URL|API_KEY|DEPLOYMENT"
# NAME=value, NAME: value, "NAME": "value" (env files, shell, YAML, JSON). Variable references
# such as ${AZURE_OPENAI_ENDPOINT:-} and empty values are not assignments of a value.
ASSIGNMENT = re.compile(
    r"\bAZURE_OPENAI_(?:" + NAMES + r")\b[\"']?[ \t]*[:=][ \t]*[\"']?(?P<value>[^\s\"'`#,})\]]*)"
)
# Azure OpenAI / AI Services / Cognitive Services resource hosts.
HOST = re.compile(
    r"\b(?P<label>[a-z0-9][a-z0-9-]*)\."
    r"(?:openai\.azure\.com|cognitiveservices\.azure\.com|services\.ai\.azure\.com)\b",
    re.IGNORECASE,
)
# A key-shaped literal (32+ letters/digits) on a line that talks about an API key.
KEY_LINE = re.compile(r"api[_-]?key", re.IGNORECASE)
KEY_VALUE = re.compile(r"(?<![A-Za-z0-9])[A-Za-z0-9]{32,}(?![A-Za-z0-9])")


MARKED_TEST_VALUE = re.compile(r"synthetic|fake|unit-test|\.(?:invalid|example|test)\b", re.I)


def synthetic(text: str) -> bool:
    return MARKED_TEST_VALUE.search(text) is not None


def findings(text: str) -> list[tuple[int, str]]:
    """(line number, rule) for every suspicious line."""
    found: list[tuple[int, str]] = []
    for number, line in enumerate(text.splitlines(), 1):
        for m in ASSIGNMENT.finditer(line):
            value = m.group("value")
            if line[: m.start()].endswith("${") and value.startswith("-"):
                value = value[1:]  # ${NAME:-default}: only the default is a value
            if value and not value.startswith("$") and not synthetic(value):
                found.append((number, "assignment"))
        for m in HOST.finditer(line):
            if not synthetic(m.group("label")):
                found.append((number, "endpoint host"))
        if KEY_LINE.search(line):
            for m in KEY_VALUE.finditer(line):
                if not synthetic(m.group(0)) and not m.group(0).isalpha():
                    found.append((number, "key-shaped value"))
    return found


def tracked_files() -> list[Path]:
    out = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True
    ).stdout.decode()
    return [ROOT / name for name in out.split("\0") if name]


def test_detector_catches_each_rule() -> None:
    # Built at run time so this file never holds a matching line itself.
    name = "AZURE_OPENAI_" + "API_KEY"
    host = "contoso-res." + "openai.azure.com"
    key = "0123456789abcdef" * 2
    samples = {
        f"{name}=abc123": "assignment",
        f"  {name}: abc123": "assignment",
        f'"{name}": "abc123"': "assignment",
        f"see https://{host}/openai/v1/": "endpoint host",
        f"api_key = '{key}'": "key-shaped value",
        f"x: ${{{name}:-abc123}}": "assignment",
    }
    for line, rule in samples.items():
        assert [r for _, r in findings(line)] == [rule], rule


def test_detector_allows_names_references_and_synthetic_values() -> None:
    name = "AZURE_OPENAI_" + "ENDPOINT"
    for line in (
        f"{name}=",
        f"{name}: ${{{name}:-}}",
        f"such as ${{{name}:-}} and",
        f"{name}: https://educonnect-synthetic-ci." + "openai.azure.com/",
        f"{name}=https://synthetic-test-endpoint.invalid/",
        f'"{name}": "https://fake-tc76.openai.azure.example"',
        f"값 없이(`{name}=`) 실행",
        f"설정 변수 이름: `{name}`",
    ):
        assert findings(line) == [], line


def test_tracked_files_hold_no_azure_secret_or_endpoint_host() -> None:
    files = tracked_files()
    assert len(files) > 50  # really the repository, not an empty listing
    hits: list[str] = []
    for path in files:
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError, FileNotFoundError, IsADirectoryError:
            continue  # binary (images) or a deleted-but-staged path
        hits += [f"{path.relative_to(ROOT)}:{n} {rule}" for n, rule in findings(text)]
    assert hits == []
