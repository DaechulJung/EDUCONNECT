> 연습용 임시 양식 — 주최 측 양식 미제공. 온보딩 개발 문서 안내 기준으로 팀이 작성했으며 주최 양식을 받으면 교체한다.

# 개발 기록: [서비스 이름]

## 1. 참여자

| 참여자 | 구분(사람·에이전트) | 역할 | 담당 작업 | 리뷰 담당 |
| --- | --- | --- | --- | --- |
| [이름] | [사람 또는 에이전트] | [역할] | [Issue 번호·문서] | [리뷰한 대상] |

## 2. 작업 기록

Issue마다 AI를 어떤 목적으로 쓰고 무엇을 지시했는지, 어떤 코드가 바뀌었고 어떻게 검증·수정·재시험했는지 적는다. 확인하지 않은 내용은 적지 않는다.

| Issue | AI 사용 목적 | 지시 요지 | 변경 코드 | 검증 | 수정 | 재시험 | 커밋 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #14 | 기반 계약 구현(모델·마이그레이션·라우트 껍데기·세션·권한·AI 경계·시험 라우트·웹 레이아웃) | BASE-01.1~10을 arch AD-3·AD-16 계약대로 구현, 이후 기능 PR이 공통 파일을 고치지 않게 고정 (AILIEN_BUILDER, Claude Opus) | `apps/api/app/models/*`, `apps/api/alembic/versions/0002*`, `apps/api/app/api/*`, `apps/api/app/core/{config,safety}.py`, `apps/api/app/ai/*`, `apps/web/app/(parent)`·`(org)`·로그인, `compose.yml` | `npm run check` PASS, smoke E2E 2/2, `gen:api` diff 없음 (PR #15 본문 AC 표) | VERIFIER 수정 요청: `DB_PORT`·`REDIS_PORT`가 앱 주소에 반영되지 않아 다른 프로젝트 DB(15432)에 접속 → 포트 변수로 주소 구성, DB 이름 `educonnect`, 파괴적 작업 전 `current_database()` 확인(`1b330d4`) | VERIFIER 격리 clone(edu-v15) `npm run check`·smoke E2E 통과, 다른 프로젝트 DB 스냅숏 차이 없음. 병합 후 검증(edu-main) api 112·web 3·E2E 2/2, 무환경 compose 기동 실패 1건 → #11 PR에서 `6d7e188`로 후속 수정 | [2af3651](https://github.com/DaechulJung/EDUCONNECT/commit/2af3651) [1e48ae4](https://github.com/DaechulJung/EDUCONNECT/commit/1e48ae4) [a25a738](https://github.com/DaechulJung/EDUCONNECT/commit/a25a738) [1b330d4](https://github.com/DaechulJung/EDUCONNECT/commit/1b330d4), 병합 [320437e](https://github.com/DaechulJung/EDUCONNECT/commit/320437e) |
| #11 | 시드 데이터·적재/초기화 명령 구현 | AC-11.1~11.4(CHG-004 반영)를 시드 JSON과 `npm run seed`·`--reset`으로 구현, #14 무환경 기동 실패를 Settings에서 수정 (AILIEN_BUILDER, Claude Opus) | `apps/api/app/seed/*`, `apps/api/app/core/config.py`, `package.json`, `.github/workflows/ci.yml` | `npm run check` api 120·web 3, 무환경 compose 기동 web·api 200, smoke E2E 2/2 (PR #16 본문 AC 표) | VERIFIER 수정 요청: 루트 `.env`의 `SEED_PASSWORD`를 읽지 못함 → 루트 `.env`도 읽음, `--reset`은 비밀번호 확인 뒤 Redis 삭제, CI에 합성 `SEED_PASSWORD`(`bb7930c`) | VERIFIER 재검토 api 122·web 3·E2E 2/2, 병합 후 TC-63~66 PASS(RUN-20261010-0950) | [6d7e188](https://github.com/DaechulJung/EDUCONNECT/commit/6d7e188) [bb7930c](https://github.com/DaechulJung/EDUCONNECT/commit/bb7930c), 병합 [78c32bd](https://github.com/DaechulJung/EDUCONNECT/commit/78c32bd) |
| #1 | 로그인·소유권·감사 시험과 자녀 단건·catalog 소유 수정 API | AC-01.1~01.13을 시드 위에서 시험, 자녀 조회는 `8d1b085`(#5 목록) 위에 단건만 추가, catalog 수정 API만 넣고 화면은 #2·#3 (AILIEN_BUILDER, Claude Opus) | `apps/api/app/api/{family,catalog}.py`, `apps/api/app/services/{family,catalog}/*`, `apps/api/app/core/ids.py`, `apps/api/tests/test_{auth,authz,audit}.py`, `tests/auth.e2e.ts`, `e2e.config.ts` | `npm run check` api 131·web 3, E2E auth 3/3·smoke 2/2 (PR 본문 AC 표) | 공유 시드 reset이 병렬 E2E 세션을 지워 실패 → workers 1 | 병합 전 VERIFIER 검토 대기 | [db0bb3b](https://github.com/DaechulJung/EDUCONNECT/commit/db0bb3b) |
| #12 | 서비스 메타 API·브랜딩 시험 | AC-12.1·12.2를 `GET /api/meta` 고정 문구와 기존 보호자 머리 슬롯으로 충족, 호스트 0건은 앱 기동 전 합성 엔드포인트로 시험 (AILIEN_BUILDER, Claude Opus) | `apps/api/app/api/meta.py`, `apps/api/tests/{test_meta,test_routes_contract}.py`, `tests/branding.e2e.ts`, `.github/workflows/ci.yml`, `apps/web/lib/client/*` | `npm run check` api 166·web 9, E2E branding 2/2·전체(ai 제외) 13/13 | 합성 값이 없으면 TC-68이 실패하도록 가드(무환경 실행으로 실패 확인) | PR 검토 대기 | [6489366](https://github.com/DaechulJung/EDUCONNECT/commit/6489366) [00f3b9b](https://github.com/DaechulJung/EDUCONNECT/commit/00f3b9b) |

## 3. 리뷰

| 대상(PR·커밋) | 작성자 | 리뷰어 | 지적 사항 | 처리 결과 |
| --- | --- | --- | --- | --- |
| PR #15 (#14) | AILIEN_BUILDER | AILIEN_VERIFIER | 포트 변수가 앱·alembic·시험 주소에 반영되지 않음(다른 프로젝트 DB 접속 위험), 전용 DB 이름·파괴적 작업 전 확인 요청(정대철_테스트 추가) | 반영 `1b330d4`, VERIFIER 승인 후 병합 `320437e` |
| PR #16 (#11) | AILIEN_BUILDER | AILIEN_VERIFIER, Codex | VERIFIER: 루트 `.env` 미적용, reset 실패 시 Redis 선삭제, CI `SEED_PASSWORD` 없음. Codex 4건(CI SEED_PASSWORD, reset 순서, TC-63~66 E2E, todo·lessons) | 반영 `bb7930c`(3건), TC-63~66은 단위 시험이라 비해당, todo·lessons는 #1 PR에서 추가. VERIFIER 승인은 BUZZ에만 남기고 병합(사후 PR 코멘트) `78c32bd` |

## 4. 개선 전후 비교

측정한 값만 적는다. 측정하지 않은 항목은 값 칸에 `미측정`을 쓴다.

| 항목 | 개선 전 | 개선 후 | 측정 방법 | 근거 |
| --- | --- | --- | --- | --- |
| [예: 시험 통과 수] | [값 또는 미측정] | [값 또는 미측정] | [명령·절차] | [경로] |

## 5. 배운 점

- [반복하지 않을 실수와 그 규칙]
