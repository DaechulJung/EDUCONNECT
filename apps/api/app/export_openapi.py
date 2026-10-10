"""Print the OpenAPI schema without a running server (`npm run gen:api` builds the web client)."""

import json
import sys

from app.main import app

# On Korean Windows `> openapi.json` would get cp949 (or fail on symbols like ✓).
# Keep UTF-8 and LF on every OS.
sys.stdout.reconfigure(encoding="utf-8", newline="\n")
schema = app.openapi()
# Same origin: the web app calls /api through Next.js rewrites, so the client needs no host.
schema.setdefault("servers", [{"url": "/"}])
json.dump(schema, sys.stdout, ensure_ascii=False, indent=2)
sys.stdout.write("\n")
