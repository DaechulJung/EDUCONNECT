# #1 병합 후 검증 — main 678efad (2026-10-10T10:15:01Z – 2026-10-10T10:16:00Z)
compose 프로젝트 edu-main, WEB/API/DB/REDIS = 13000/18000/25432/26379, LLM_PROVIDER=fake, ENABLE_TEST_ROUTES=1, 임의 SEED_PASSWORD
- npm run check exit 0 (api 134 passed, web vitest) — check.log
- pytest test_auth·test_authz·test_audit -v 16 passed — pytest-tc.log (TC-03~09·11·12·76)
- compose up --build --wait exit 0 — up.log
- npx e2e run auth+smoke 5/5 passed, skip 0, vcs commit 678efad dirty=false — e2e.log, report.json, e2e-results.txt (TC-01·02·10)
- 시드 비밀번호 로그 노출 0건 — secret-scan.log
