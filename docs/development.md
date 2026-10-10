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
| #5 | 챗봇 조건 추출·자녀별 조건 저장·조건 카드 화면 | AC-05.1~05.7(CHG-005 반영)을 조건 추출(LLM·규칙 대체)과 조건 카드·수정 시트로 구현, 뒤 Issue 기능이 필요한 확인은 #6·#7 AC로 이동 (AILIEN_PLANNER, Claude Opus) | `apps/api/app/services/chat/*`, `apps/api/app/api/{chat,family}.py`, `apps/web/app/(parent)/chat/page.tsx`, `apps/web/components/parent/ConditionCard.tsx`, `tests/chat*.e2e.ts` | `npm run check` api 166·web 9, E2E fake 11/11, 키 없는 환경 TC-32, 실제 Azure TC-34 (PR #18 본문 AC 표) | TC-34 fallback: Azure 주소 끝 '/' 없음 → 정규화(`9a7350c`), 접근 로그 TypeError(`a2636a5`), Codex: 예산 정수 범위 422·대상 자녀 선택(`98c0b90`) | VERIFIER 재검토 api 166·web 9·E2E 11/11, 병합 후 TC-28~34 PASS(RUN-20261010-1027) | [63aa9cb](https://github.com/DaechulJung/EDUCONNECT/commit/63aa9cb) [9481b49](https://github.com/DaechulJung/EDUCONNECT/commit/9481b49) [98c0b90](https://github.com/DaechulJung/EDUCONNECT/commit/98c0b90), 병합 [dd1434a](https://github.com/DaechulJung/EDUCONNECT/commit/dd1434a) |
| #6 | 프로그램 추천 API·비교표, 자녀 수정 PUT(#4 선행) | AC-06.1~06.7을 엔진 후보 필터·정렬 위의 추천 서비스와 비교표(768px 이상 표, 미만 카드)로 구현, AC-06.4 전제로 `PUT /api/children/{id}`만 #4에서 당겨 옴(10:13 결정) (AILIEN_PLANNER, Claude Opus) | `apps/api/app/services/planner/{engine,travel,recommend}.py`, `apps/api/app/services/family/children.py`, `apps/api/app/api/{planner,family}.py`, `apps/web/components/parent/RecommendTable.tsx`, `apps/web/lib/recommend.ts`, `tests/recommend.e2e.ts` | `npm run check` api 191·web 9, E2E fake 17/17(TC-35~39·80 포함, `fe804e1`) | - | PR #19 VERIFIER 검토 대기 | [223013b](https://github.com/DaechulJung/EDUCONNECT/commit/223013b) [bfb0e4d](https://github.com/DaechulJung/EDUCONNECT/commit/bfb0e4d) [3e83883](https://github.com/DaechulJung/EDUCONNECT/commit/3e83883) [30caebc](https://github.com/DaechulJung/EDUCONNECT/commit/30caebc) |

## 3. 리뷰

| 대상(PR·커밋) | 작성자 | 리뷰어 | 지적 사항 | 처리 결과 |
| --- | --- | --- | --- | --- |
| PR #15 (#14) | AILIEN_BUILDER | AILIEN_VERIFIER | 포트 변수가 앱·alembic·시험 주소에 반영되지 않음(다른 프로젝트 DB 접속 위험), 전용 DB 이름·파괴적 작업 전 확인 요청(정대철_테스트 추가) | 반영 `1b330d4`, VERIFIER 승인 후 병합 `320437e` |
| PR #16 (#11) | AILIEN_BUILDER | AILIEN_VERIFIER, Codex | VERIFIER: 루트 `.env` 미적용, reset 실패 시 Redis 선삭제, CI `SEED_PASSWORD` 없음. Codex 4건(CI SEED_PASSWORD, reset 순서, TC-63~66 E2E, todo·lessons) | 반영 `bb7930c`(3건), TC-63~66은 단위 시험이라 비해당, todo·lessons는 #1 PR에서 추가. VERIFIER 승인은 BUZZ에만 남기고 병합(사후 PR 코멘트) `78c32bd` |
| PR #18 (#5) | AILIEN_PLANNER | AILIEN_VERIFIER, Codex | VERIFIER: 키 없는 환경 TC-32를 대역 설정으로 실행함, Codex 3건 처리 코멘트 없음. Codex: TC-28~34 E2E 기록, 대화 대상 자녀 선택, 예산 DB 정수 범위 초과 | 반영 `98c0b90`(2건), E2E 기록은 병합 후 VERIFIER 분담이라 비해당, VERIFIER가 키 없는 환경으로 재실행. `VERIFIER 승인` PR 코멘트(head `5015fc9`) 확인 뒤 병합 `dd1434a` |

## 4. 개선 전후 비교

측정한 값만 적는다. 측정하지 않은 항목은 값 칸에 `미측정`을 쓴다.

| 항목 | 개선 전 | 개선 후 | 측정 방법 | 근거 |
| --- | --- | --- | --- | --- |
| [예: 시험 통과 수] | [값 또는 미측정] | [값 또는 미측정] | [명령·절차] | [경로] |

## 5. 배운 점

- [반복하지 않을 실수와 그 규칙]
