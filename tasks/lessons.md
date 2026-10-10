
## 2026-10-10 - #14 기반 작업(계약·세션·AI 경계·레이아웃)
- 문제·원인: FastAPI 0.142는 `app.routes`에 `_IncludedRouter`만 남겨 경로 목록 시험이 빈 집합이 됐다. conftest를 `conftest`와 `tests.conftest` 두 이름으로 import해 무작위 시험 비밀번호가 달라져 로그인 시험이 401로 실패했다.
- 교훈: 경로 계약은 `app.openapi()["paths"]`로 비교한다. 시험 전역 값은 `os.environ.setdefault`처럼 import 경로와 무관하게 하나로 둔다.
- 다음에 적용할 것: zsh에서는 연관 배열(`declare -A`)을 쓰지 말고 `bash -c` + here-doc으로 반복한다. 워크트리마다 `COMPOSE_PROJECT_NAME`과 `apps/api/.env`(로컬 포트)를 먼저 맞춘다.

## 2026-10-10 - #11 시드 데이터 [BUILDER] (병합 뒤 작성)
- 문제·원인: (1) README는 "`.env`에 SEED_PASSWORD"라고 했지만 `uv run --directory apps/api` + `env_file=".env"`라 `apps/api/.env`만 읽혀 루트 `.env`로는 실패했다. (2) `--reset`이 Redis 세션을 먼저 지우고 비밀번호를 나중에 확인해, 실패해도 세션이 사라졌다. (3) CI e2e job에 `SEED_PASSWORD`가 없어 `/api/test/reset`을 부르는 E2E가 깨질 수 있었다. (4) PR #16을 BUZZ 승인만 보고 병합해 PR 코멘트 `VERIFIER 승인`이 없었다.
- 교훈: 설정 파일 경로는 실행 디렉터리 기준으로 README 명령 그대로 재현한다. 파괴 작업은 검증을 모두 마친 뒤 시작한다. CI env는 앞으로 부를 시험 라우트까지 본다. 병합 기록은 PR 코멘트다.
- 다음에 적용할 것: 병합 전 `gh pr view <PR> --comments`로 `VERIFIER 승인`과 Codex 지적별 처리 코멘트를 확인한다.

## 2026-10-10 - #1 로그인·권한·감사 [BUILDER]
- 문제·원인: E2E 파일 두 개가 병렬로 돌면서 서로의 `/api/test/reset`이 세션을 모두 지워 로그인 상태가 풀렸다. 잘못된 형식의 id는 422로 새어 남의 자원 존재를 404와 다르게 드러낼 수 있었다.
- 교훈: 공유 시드를 reset하는 E2E는 worker 1개로 돌린다. 소유 자원 경로의 id 파싱 실패는 404(deny_not_found)로 같은 감사 경로를 탄다.
- 다음에 적용할 것: 로그아웃 401 같은 부정 시험은 같은 쿠키로 먼저 200을 확인해 대비를 둔다(TC-09).
