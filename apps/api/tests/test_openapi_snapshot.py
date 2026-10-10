"""BASE-01.3: the committed apps/web/openapi.json equals the current FastAPI schema.

`npm run gen:api` regenerates it with apps/web/lib/client; a difference means the generated
client is stale (AD-3: regenerate instead of merging by hand)."""

import json
import subprocess
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1]
COMMITTED = API_DIR.parent / "web" / "openapi.json"


def test_committed_openapi_json_is_current() -> None:
    exported = subprocess.run(
        [sys.executable, "-m", "app.export_openapi"],
        cwd=API_DIR,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    assert json.loads(exported) == json.loads(COMMITTED.read_text(encoding="utf-8"))
