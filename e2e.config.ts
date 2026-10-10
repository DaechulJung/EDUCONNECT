import type { E2EConfig } from 'e2e'
import { web } from '@e2e-dev/web'

// Browser tests (tests/*.e2e.ts) for the TC list in docs/e2e-test.md, run against an app that is already up:
// `docker compose up --build --wait` (what CI does) or `npm run dev:api` + `npm run dev:web`.
export default {
  targets: [{ engine: web(), app: { url: process.env.APP_URL ?? 'http://localhost:3000' } }],
  // One worker: every TC resets the shared seed (POST /api/test/reset clears all sessions), so
  // parallel files would sign each other out. CI already runs with one worker.
  workers: 1,
} satisfies E2EConfig
